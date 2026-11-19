import request from 'supertest';
import { ReservationStatus, Role } from '@prisma/client';
import { app } from '../../src/app.js';
import { prisma } from '../../src/services/prisma.js';
import { generateToken } from '../../src/utils/token.js';

jest.mock('../../src/services/prisma.js', () => ({
  prisma: {
    item: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    reservation: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  item: {
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  reservation: {
    count: jest.Mock;
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const transaction = {
  systemSettings: {
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  reservation: {
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  item: {
    findUnique: jest.fn(),
  },
  maintenanceRecord: {
    findFirst: jest.fn(),
  },
};

const adminToken = generateToken({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'admin@reservalab.com',
  role: Role.ADMIN,
});

const userToken = generateToken({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  email: 'user@reservalab.com',
  role: Role.USER,
});

const itemId = '33333333-3333-4333-8333-333333333333';
const category = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Notebooks',
  description: null,
};

function futurePeriod(rentDays = 3) {
  const pickupDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const returnDate = new Date(pickupDate.getTime() + rentDays * 24 * 60 * 60 * 1000);
  return {
    item_id: itemId,
    expected_pickup_at: pickupDate.toISOString(),
    expected_return_at: returnDate.toISOString(),
  };
}

describe('Controle de quantidade multi-unidade e validações de consulta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PATCH /api/admin/items/:id/quantity aumenta a quantidade do equipamento para 2', async () => {
    mockedPrisma.item.findUnique.mockResolvedValue({
      id: itemId,
      name: 'MacBook Air M2 13"',
      quantity: 1,
    });
    mockedPrisma.item.update.mockResolvedValue({
      id: itemId,
      name: 'MacBook Air M2 13"',
      quantity: 2,
      category,
    });

    const response = await request(app)
      .patch(`/api/admin/items/${itemId}/quantity`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 2 });

    expect(response.status).toBe(200);
    expect(response.body.item.quantity).toBe(2);
  });

  it('recusa redução de quantidade abaixo dos empréstimos atualmente ativos (400)', async () => {
    mockedPrisma.item.findUnique.mockResolvedValue({
      id: itemId,
      name: 'MacBook Air M2 13"',
      quantity: 3,
    });
    mockedPrisma.reservation.count.mockResolvedValue(2);

    const response = await request(app)
      .patch(`/api/admin/items/${itemId}/quantity`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 1 });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('atualmente emprestada');
    expect(mockedPrisma.item.update).not.toHaveBeenCalled();
  });

  it('rejeita quantidade menor que 1 via validação Zod (400)', async () => {
    const response = await request(app)
      .patch(`/api/admin/items/${itemId}/quantity`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 0 });

    expect(response.status).toBe(400);
    expect(mockedPrisma.item.findUnique).not.toHaveBeenCalled();
  });

  it('calcula available_quantity no catálogo quando item possui 2 unidades', async () => {
    mockedPrisma.item.findMany.mockResolvedValue([
      {
        id: itemId,
        name: 'MacBook Air M2 13"',
        patrimony_code: 'PAT-001',
        quantity: 2,
        is_active: true,
        category_id: category.id,
        category,
        reservations: [{ id: 'res-1' }],
        maintenance: [],
      },
    ]);
    mockedPrisma.reservation.count.mockResolvedValueOnce(1);

    const withOneAvailable = await request(app).get('/api/items').query({
      pickup_date: '2026-12-01T10:00:00.000Z',
      return_date: '2026-12-03T10:00:00.000Z',
    });

    expect(withOneAvailable.status).toBe(200);
    expect(withOneAvailable.body.items[0]).toMatchObject({
      quantity: 2,
      available_quantity: 1,
      is_available: true,
    });

    mockedPrisma.reservation.count.mockResolvedValueOnce(2);

    const fullyBooked = await request(app).get('/api/items').query({
      pickup_date: '2026-12-01T10:00:00.000Z',
      return_date: '2026-12-03T10:00:00.000Z',
    });

    expect(fullyBooked.status).toBe(200);
    expect(fullyBooked.body.items[0]).toMatchObject({
      quantity: 2,
      available_quantity: 0,
      is_available: false,
    });
  });

  it('permite segunda reserva simultânea quando quantity é 2 e bloqueia a terceira com 409', async () => {
    transaction.systemSettings.findFirst.mockResolvedValue({
      max_rent_days: 14,
      max_concurrent_items: 5,
    });
    transaction.user.findUnique.mockResolvedValue({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      is_manually_blocked: false,
    });
    transaction.item.findUnique.mockResolvedValue({
      id: itemId,
      is_active: true,
      quantity: 2,
    });
    transaction.maintenanceRecord.findFirst.mockResolvedValue(null);
    transaction.reservation.findFirst.mockImplementation(async ({ where }) => {
      if ('item_id' in where) return { id: 'existing-res-1' };
      return null;
    });
    transaction.reservation.create.mockImplementation(async ({ data }) => ({
      id: 'new-res-2',
      ...data,
      status: ReservationStatus.SCHEDULED,
    }));
    mockedPrisma.$transaction.mockImplementation(async (callback) => callback(transaction));

    // Cenário 1: 1 reserva sobreposta, quantidade total = 2 -> permite criar (201)
    transaction.reservation.count.mockImplementation(async ({ where }) => {
      if ('item_id' in where) return 1;
      return 0;
    });

    const allowedSecond = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send(futurePeriod());

    expect(allowedSecond.status).toBe(201);

    // Cenário 2: 2 reservas sobrepostas, quantidade total = 2 -> bloqueia com 409
    transaction.reservation.count.mockImplementation(async ({ where }) => {
      if ('item_id' in where) return 2;
      return 0;
    });

    const blockedThird = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send(futurePeriod());

    expect(blockedThird.status).toBe(409);
    expect(blockedThird.body.error).toContain('já reservado');
  });

  it('valida UUID de category_id em GET /api/items e status em GET /api/admin/loans/history', async () => {
    const invalidCategory = await request(app)
      .get('/api/items')
      .query({ category_id: 'nao-e-uuid' });

    expect(invalidCategory.status).toBe(400);
    expect(invalidCategory.body.error).toBe('ID de categoria inválido');

    const invalidHistoryStatus = await request(app)
      .get('/api/admin/loans/history')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'INVALID_STATUS' });

    expect(invalidHistoryStatus.status).toBe(400);
  });
});
