import request from 'supertest';
import { Prisma, ReservationStatus, Role } from '@prisma/client';
import { app } from '../../src/app.js';
import { prisma } from '../../src/services/prisma.js';
import { generateToken } from '../../src/utils/token.js';

jest.mock('../../src/services/prisma.js', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
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

const userId = '11111111-1111-4111-8111-111111111111';
const itemId = '33333333-3333-4333-8333-333333333333';
const token = generateToken({
  id: userId,
  email: 'gustavo@example.com',
  role: Role.USER,
});

function futurePeriod(daysUntilPickup = 7, rentDays = 2) {
  const pickupDate = new Date(Date.now() + daysUntilPickup * 24 * 60 * 60 * 1000);
  const returnDate = new Date(pickupDate.getTime() + rentDays * 24 * 60 * 60 * 1000);

  return {
    pickupDate,
    returnDate,
    body: {
      item_id: itemId,
      expected_pickup_at: pickupDate.toISOString(),
      expected_return_at: returnDate.toISOString(),
    },
  };
}

function configureSuccessfulTransaction(): void {
  transaction.systemSettings.findFirst.mockResolvedValue({
    max_rent_days: 14,
    max_concurrent_items: 3,
  });
  transaction.user.findUnique.mockResolvedValue({
    id: userId,
    is_manually_blocked: false,
  });
  transaction.reservation.findFirst.mockResolvedValue(null);
  transaction.reservation.count.mockResolvedValue(0);
  transaction.item.findUnique.mockResolvedValue({ id: itemId, is_active: true });
  transaction.maintenanceRecord.findFirst.mockResolvedValue(null);
  transaction.reservation.create.mockImplementation(async ({ data }) => ({
    id: '44444444-4444-4444-8444-444444444444',
    ...data,
    created_at: new Date(),
  }));
  mockedPrisma.$transaction.mockImplementation(async (callback) => callback(transaction));
}

describe('TASK-A03 — criação de reserva direta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureSuccessfulTransaction();
  });

  it('AC-019: exige autenticação antes de consultar reservas @spec:AC-019', async () => {
    const response = await request(app).post('/api/reservations').send(futurePeriod().body);

    expect(response.status).toBe(401);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('AC-020: recusa identificador e datas inválidas @spec:AC-020', async () => {
    const invalidId = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...futurePeriod().body, item_id: 'item-invalido' });

    const pastPickup = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const pastReturn = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const past = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item_id: itemId,
        expected_pickup_at: pastPickup.toISOString(),
        expected_return_at: pastReturn.toISOString(),
      });

    const period = futurePeriod();
    const inverted = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item_id: itemId,
        expected_pickup_at: period.returnDate.toISOString(),
        expected_return_at: period.pickupDate.toISOString(),
      });

    expect(invalidId.status).toBe(400);
    expect(past.status).toBe(400);
    expect(inverted.status).toBe(400);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('AC-021: bloqueia usuário manualmente impedido ou com atraso @spec:AC-021', async () => {
    transaction.user.findUnique.mockResolvedValueOnce({
      id: userId,
      is_manually_blocked: true,
    });

    const manuallyBlocked = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod().body);

    transaction.user.findUnique.mockResolvedValueOnce({
      id: userId,
      is_manually_blocked: false,
    });
    transaction.reservation.findFirst.mockResolvedValueOnce({ id: 'overdue-id' });

    const overdue = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod().body);

    expect(manuallyBlocked.status).toBe(403);
    expect(overdue.status).toBe(403);
    expect(transaction.reservation.create).not.toHaveBeenCalled();
  });

  it('AC-022: recusa nova reserva quando o limite está atingido @spec:AC-022', async () => {
    transaction.systemSettings.findFirst.mockResolvedValue({
      max_rent_days: 14,
      max_concurrent_items: 2,
    });
    transaction.reservation.count.mockResolvedValue(2);

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod().body);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Limite de reservas ativas atingido');
    expect(transaction.reservation.create).not.toHaveBeenCalled();
  });

  it('AC-023: recusa período acima do máximo configurado @spec:AC-023', async () => {
    transaction.systemSettings.findFirst.mockResolvedValue({
      max_rent_days: 2,
      max_concurrent_items: 3,
    });

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod(7, 3).body);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('2 dias');
    expect(transaction.reservation.create).not.toHaveBeenCalled();
  });

  it('AC-024: diferencia equipamento inexistente de inativo @spec:AC-024', async () => {
    transaction.item.findUnique.mockResolvedValueOnce(null);

    const missing = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod().body);

    transaction.item.findUnique.mockResolvedValueOnce({ id: itemId, is_active: false });

    const inactive = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod().body);

    expect(missing.status).toBe(404);
    expect(inactive.status).toBe(409);
    expect(transaction.reservation.create).not.toHaveBeenCalled();
  });

  it('AC-025: recusa reserva sobreposta do equipamento @spec:AC-025', async () => {
    const period = futurePeriod();
    transaction.reservation.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'conflicting-reservation-id' });

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(period.body);

    expect(response.status).toBe(409);
    expect(transaction.reservation.findFirst).toHaveBeenLastCalledWith({
      where: {
        item_id: itemId,
        status: {
          in: [ReservationStatus.SCHEDULED, ReservationStatus.ACTIVE_LOAN],
        },
        expected_pickup_at: { lt: period.returnDate },
        expected_return_at: { gt: period.pickupDate },
      },
      select: { id: true },
    });
    expect(transaction.reservation.create).not.toHaveBeenCalled();
  });

  it('AC-026: recusa manutenção sobreposta do equipamento @spec:AC-026', async () => {
    const period = futurePeriod();
    transaction.maintenanceRecord.findFirst.mockResolvedValue({ id: 'maintenance-id' });

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(period.body);

    expect(response.status).toBe(409);
    expect(transaction.maintenanceRecord.findFirst).toHaveBeenCalledWith({
      where: {
        item_id: itemId,
        start_date: { lt: period.returnDate },
        OR: [
          { end_date: null },
          { end_date: { gt: period.pickupDate } },
        ],
      },
      select: { id: true },
    });
    expect(transaction.reservation.create).not.toHaveBeenCalled();
  });

  it('AC-027: cria reserva SCHEDULED para o usuário autenticado @spec:AC-027', async () => {
    const period = futurePeriod();

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(period.body);

    expect(response.status).toBe(201);
    expect(response.body.reservation).toMatchObject({
      user_id: userId,
      item_id: itemId,
      status: ReservationStatus.SCHEDULED,
    });
    expect(transaction.reservation.create).toHaveBeenCalledWith({
      data: {
        user_id: userId,
        item_id: itemId,
        expected_pickup_at: period.pickupDate,
        expected_return_at: period.returnDate,
        status: ReservationStatus.SCHEDULED,
      },
    });
  });

  it('AC-028: serializa tentativas simultâneas e cria no máximo uma reserva @spec:AC-028', async () => {
    let reserved = false;
    let queue = Promise.resolve();

    transaction.reservation.findFirst.mockImplementation(async ({ where }) => {
      if ('item_id' in where) {
        return reserved ? { id: 'existing-reservation-id' } : null;
      }
      return null;
    });
    transaction.reservation.create.mockImplementation(async ({ data }) => {
      reserved = true;
      return {
        id: 'created-reservation-id',
        ...data,
        created_at: new Date(),
      };
    });
    mockedPrisma.$transaction.mockImplementation((callback) => {
      const operation = queue.then(() => callback(transaction));
      queue = operation.then(() => undefined, () => undefined);
      return operation;
    });

    const body = futurePeriod().body;
    const [first, second] = await Promise.all([
      request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send(body),
      request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(transaction.reservation.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  });

  it('AC-028: repete conflito serializável de forma controlada @spec:AC-028', async () => {
    mockedPrisma.$transaction
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockImplementationOnce(async (callback) => callback(transaction));

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod().body);

    expect(response.status).toBe(201);
    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('AC-029: usa 14 dias e 3 itens quando não há configuração @spec:AC-029', async () => {
    transaction.systemSettings.findFirst.mockResolvedValue(null);
    transaction.reservation.count.mockResolvedValueOnce(3);

    const limitReached = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod(7, 2).body);

    transaction.reservation.count.mockResolvedValueOnce(2);

    const withinDefaults = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod(7, 14).body);

    const aboveDefaultDays = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod(7, 15).body);

    expect(limitReached.status).toBe(400);
    expect(limitReached.body.error).toBe('Limite de reservas ativas atingido');
    expect(withinDefaults.status).toBe(201);
    expect(aboveDefaultDays.status).toBe(400);
    expect(aboveDefaultDays.body.error).toContain('14 dias');
  });
});
