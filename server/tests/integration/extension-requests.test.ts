import request from 'supertest';
import { ReservationStatus, Role } from '@prisma/client';
import { app } from '../../src/app.js';
import { prisma } from '../../src/services/prisma.js';
import { generateToken } from '../../src/utils/token.js';

jest.mock('../../src/services/prisma.js', () => ({
  prisma: {
    systemSettings: {
      findFirst: jest.fn(),
    },
    reservation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  systemSettings: {
    findFirst: jest.Mock;
  };
  reservation: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
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

const userId = '11111111-1111-4111-8111-111111111111';
const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const itemId = '33333333-3333-4333-8333-333333333333';
const reservationId = '44444444-4444-4444-8444-444444444444';

const userToken = generateToken({
  id: userId,
  email: 'usuario@reservalab.com',
  role: Role.USER,
});

const adminToken = generateToken({
  id: adminId,
  email: 'admin@reservalab.com',
  role: Role.ADMIN,
});

function buildExtendedPeriod(days = 20) {
  const pickupDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const returnDate = new Date(pickupDate.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    pickupDate,
    returnDate,
    expected_pickup_at: pickupDate.toISOString(),
    expected_return_at: returnDate.toISOString(),
  };
}

describe('Fluxo de solicitação e análise de prazo estendido + GET /api/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    transaction.item.findUnique.mockResolvedValue({
      id: itemId,
      is_active: true,
      quantity: 1,
    });
    transaction.maintenanceRecord.findFirst.mockResolvedValue(null);
    transaction.reservation.create.mockImplementation(async ({ data }) => ({
      id: reservationId,
      ...data,
      created_at: new Date(),
    }));
    mockedPrisma.$transaction.mockImplementation(async (callback) => callback(transaction));
  });

  it('GET /api/settings retorna parâmetros configurados no banco', async () => {
    mockedPrisma.systemSettings.findFirst.mockResolvedValue({
      max_rent_days: 21,
      max_concurrent_items: 4,
    });

    const response = await request(app).get('/api/settings');

    expect(response.status).toBe(200);
    expect(response.body.settings).toEqual({
      max_rent_days: 21,
      max_concurrent_items: 4,
    });
  });

  it('GET /api/settings utiliza valores padrão (14 dias e 3 itens) quando não há registro', async () => {
    mockedPrisma.systemSettings.findFirst.mockResolvedValue(null);

    const response = await request(app).get('/api/settings');

    expect(response.status).toBe(200);
    expect(response.body.settings).toEqual({
      max_rent_days: 14,
      max_concurrent_items: 3,
    });
  });

  it('recusa reserva acima de max_rent_days quando request_reason não é enviado', async () => {
    const period = buildExtendedPeriod(20);

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        item_id: itemId,
        expected_pickup_at: period.expected_pickup_at,
        expected_return_at: period.expected_return_at,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('14 dias');
    expect(transaction.reservation.create).not.toHaveBeenCalled();
  });

  it('cria reserva com approval_status PENDING quando excede max_rent_days com justificativa', async () => {
    const period = buildExtendedPeriod(20);

    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        item_id: itemId,
        expected_pickup_at: period.expected_pickup_at,
        expected_return_at: period.expected_return_at,
        request_reason: 'Projeto de conclusão de curso com coleta estendida em campo.',
      });

    expect(response.status).toBe(201);
    expect(response.body.reservation).toMatchObject({
      status: ReservationStatus.SCHEDULED,
      approval_status: 'PENDING',
      request_reason: 'Projeto de conclusão de curso com coleta estendida em campo.',
    });
  });

  it('bloqueia confirmação de retirada física enquanto a solicitação estiver PENDING', async () => {
    mockedPrisma.reservation.findUnique.mockResolvedValue({
      id: reservationId,
      status: ReservationStatus.SCHEDULED,
      approval_status: 'PENDING',
      loan: null,
    });

    const response = await request(app)
      .post('/api/admin/loans/pickup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reservation_id: reservationId });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('aguarda aprovação');
  });

  it('lista solicitações de prazo maior ordenadas com PENDING no topo e bloqueia não-admin', async () => {
    const forbidden = await request(app)
      .get('/api/admin/extension-requests')
      .set('Authorization', `Bearer ${userToken}`);

    expect(forbidden.status).toBe(403);

    mockedPrisma.reservation.findMany.mockResolvedValue([
      {
        id: 'decided-1',
        approval_status: 'APPROVED',
        created_at: new Date('2026-11-18T12:00:00.000Z'),
      },
      {
        id: 'pending-1',
        approval_status: 'PENDING',
        created_at: new Date('2026-11-17T12:00:00.000Z'),
      },
    ]);

    const response = await request(app)
      .get('/api/admin/extension-requests')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.requests.map((r: { id: string }) => r.id)).toEqual([
      'pending-1',
      'decided-1',
    ]);
  });

  it('aprova solicitação PENDING mantendo status SCHEDULED', async () => {
    mockedPrisma.reservation.findUnique.mockResolvedValue({
      id: reservationId,
      status: ReservationStatus.SCHEDULED,
      approval_status: 'PENDING',
    });
    mockedPrisma.reservation.update.mockResolvedValue({
      id: reservationId,
      status: ReservationStatus.SCHEDULED,
      approval_status: 'APPROVED',
      admin_decision_reason: 'Autorizado pelo coordenador',
    });

    const response = await request(app)
      .patch(`/api/admin/extension-requests/${reservationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'APPROVE',
        decision_reason: 'Autorizado pelo coordenador',
      });

    expect(response.status).toBe(200);
    expect(response.body.reservation.approval_status).toBe('APPROVED');
    expect(response.body.reservation.status).toBe(ReservationStatus.SCHEDULED);
  });

  it('exige justificativa obrigatória ao reprovar solicitação e cancela ao informar motivo', async () => {
    const missingReason = await request(app)
      .patch(`/api/admin/extension-requests/${reservationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REJECT',
        decision_reason: ' ',
      });

    expect(missingReason.status).toBe(400);

    mockedPrisma.reservation.findUnique.mockResolvedValue({
      id: reservationId,
      status: ReservationStatus.SCHEDULED,
      approval_status: 'PENDING',
    });
    mockedPrisma.reservation.update.mockResolvedValue({
      id: reservationId,
      status: ReservationStatus.CANCELLED,
      approval_status: 'REJECTED',
      admin_decision_reason: 'Equipamento reservado para turma de laboratório.',
    });

    const rejected = await request(app)
      .patch(`/api/admin/extension-requests/${reservationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'REJECT',
        decision_reason: 'Equipamento reservado para turma de laboratório.',
      });

    expect(rejected.status).toBe(200);
    expect(rejected.body.reservation.approval_status).toBe('REJECTED');
    expect(rejected.body.reservation.status).toBe(ReservationStatus.CANCELLED);
    expect(rejected.body.reservation.admin_decision_reason).toBe(
      'Equipamento reservado para turma de laboratório.'
    );
  });

  it('retorna 404 para solicitação inexistente e 400 se já tiver sido analisada', async () => {
    mockedPrisma.reservation.findUnique.mockResolvedValueOnce(null);

    const notFound = await request(app)
      .patch(`/api/admin/extension-requests/${reservationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE' });

    expect(notFound.status).toBe(404);

    mockedPrisma.reservation.findUnique.mockResolvedValueOnce({
      id: reservationId,
      approval_status: 'APPROVED',
    });

    const alreadyDecided = await request(app)
      .patch(`/api/admin/extension-requests/${reservationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE' });

    expect(alreadyDecided.status).toBe(400);
    expect(alreadyDecided.body.error).toContain('já foi analisada');
  });

  it('não permite analisar solicitação PENDING cuja reserva já foi cancelada pelo usuário', async () => {
    mockedPrisma.reservation.findUnique.mockResolvedValueOnce({
      id: reservationId,
      status: ReservationStatus.CANCELLED,
      approval_status: 'PENDING',
    });

    const response = await request(app)
      .patch(`/api/admin/extension-requests/${reservationId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('não está mais agendada');
    expect(mockedPrisma.reservation.update).not.toHaveBeenCalled();
  });

  it('não lista como pendente uma solicitação cuja reserva foi cancelada', async () => {
    mockedPrisma.reservation.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/admin/extension-requests')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(mockedPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { approval_status: { in: ['APPROVED', 'REJECTED'] } },
            { approval_status: 'PENDING', status: ReservationStatus.SCHEDULED },
          ],
        },
      })
    );
  });
});
