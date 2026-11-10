import request from 'supertest';
import { Prisma, ReservationStatus, Role } from '@prisma/client';
import { app } from '../../src/app.js';
import { prisma } from '../../src/services/prisma.js';
import { generateToken } from '../../src/utils/token.js';

jest.mock('../../src/services/prisma.js', () => ({
  prisma: {
    reservation: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  reservation: {
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

const transaction = {
  reservation: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const userId = '11111111-1111-4111-8111-111111111111';
const reservationId = '44444444-4444-4444-8444-444444444444';
const otherReservationId = '55555555-5555-4555-8555-555555555555';
const token = generateToken({
  id: userId,
  email: 'gustavo@example.com',
  role: Role.USER,
});

const category = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Notebooks',
  description: null,
};

const item = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Notebook Dell',
  patrimony_code: 'PAT-001',
  is_active: true,
  category_id: category.id,
  category,
};

const scheduledReservation = {
  id: reservationId,
  user_id: userId,
  item_id: item.id,
  expected_pickup_at: new Date('2026-12-01T10:00:00.000Z'),
  expected_return_at: new Date('2026-12-03T10:00:00.000Z'),
  status: ReservationStatus.SCHEDULED,
  created_at: new Date('2026-11-05T10:00:00.000Z'),
  item,
  loan: null,
};

const cancelledReservation = {
  ...scheduledReservation,
  status: ReservationStatus.CANCELLED,
};

const reservationDetailsInclude = {
  item: {
    include: {
      category: true,
    },
  },
  loan: true,
};

function configureSuccessfulCancellation(): void {
  mockedPrisma.reservation.findMany.mockResolvedValue([scheduledReservation]);
  transaction.reservation.findFirst.mockResolvedValue({
    id: reservationId,
    status: ReservationStatus.SCHEDULED,
  });
  transaction.reservation.updateMany.mockResolvedValue({ count: 1 });
  transaction.reservation.findUnique.mockResolvedValue(cancelledReservation);
  mockedPrisma.$transaction.mockImplementation(async (callback) => callback(transaction));
}

describe('TASK-A04 — histórico próprio e cancelamento de reserva', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureSuccessfulCancellation();
  });

  it('AC-030: exige autenticação para consultar o histórico @spec:AC-030', async () => {
    const response = await request(app).get('/api/reservations/my-reservations');

    expect(response.status).toBe(401);
    expect(mockedPrisma.reservation.findMany).not.toHaveBeenCalled();
  });

  it('AC-031: lista somente reservas do usuário com seus relacionamentos @spec:AC-031', async () => {
    const response = await request(app)
      .get('/api/reservations/my-reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.reservations[0]).toMatchObject({
      id: reservationId,
      user_id: userId,
      item: {
        id: item.id,
        category,
      },
      loan: null,
    });
    expect(mockedPrisma.reservation.findMany).toHaveBeenCalledWith({
      where: { user_id: userId },
      include: reservationDetailsInclude,
      orderBy: { created_at: 'desc' },
    });
  });

  it('AC-032: devolve lista vazia quando o usuário não possui reservas @spec:AC-032', async () => {
    mockedPrisma.reservation.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/reservations/my-reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reservations: [] });
  });

  it('AC-033: ordena o histórico do mais recente para o mais antigo @spec:AC-033', async () => {
    await request(app)
      .get('/api/reservations/my-reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(mockedPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { created_at: 'desc' } })
    );
  });

  it('AC-034: exige autenticação para cancelar uma reserva @spec:AC-034', async () => {
    const response = await request(app).patch(
      `/api/reservations/${reservationId}/cancel`
    );

    expect(response.status).toBe(401);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('AC-035: recusa identificador de reserva inválido @spec:AC-035', async () => {
    const response = await request(app)
      .patch('/api/reservations/id-invalido/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('AC-036: cancela reserva própria agendada e devolve seus dados @spec:AC-036', async () => {
    const response = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.reservation).toMatchObject({
      id: reservationId,
      user_id: userId,
      status: ReservationStatus.CANCELLED,
      item: {
        id: item.id,
        category,
      },
      loan: null,
    });
    expect(transaction.reservation.updateMany).toHaveBeenCalledWith({
      where: {
        id: reservationId,
        user_id: userId,
        status: ReservationStatus.SCHEDULED,
      },
      data: { status: ReservationStatus.CANCELLED },
    });
    expect(transaction.reservation.findUnique).toHaveBeenCalledWith({
      where: { id: reservationId },
      include: reservationDetailsInclude,
    });
  });

  it('AC-037: recusa cancelamento após retirada ou finalização @spec:AC-037', async () => {
    transaction.reservation.findFirst
      .mockResolvedValueOnce({ id: reservationId, status: ReservationStatus.ACTIVE_LOAN })
      .mockResolvedValueOnce({ id: reservationId, status: ReservationStatus.COMPLETED });

    const activeLoan = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    const completed = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(activeLoan.status).toBe(400);
    expect(completed.status).toBe(400);
    expect(transaction.reservation.updateMany).not.toHaveBeenCalled();
  });

  it('AC-038: responde 404 sem distinguir reserva inexistente ou alheia @spec:AC-038', async () => {
    transaction.reservation.findFirst.mockResolvedValue(null);

    const missing = await request(app)
      .patch(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    const ownedByAnotherUser = await request(app)
      .patch(`/api/reservations/${otherReservationId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(missing.status).toBe(404);
    expect(ownedByAnotherUser.status).toBe(404);
    expect(missing.body.error).toBe(ownedByAnotherUser.body.error);
    expect(transaction.reservation.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: otherReservationId,
        user_id: userId,
      },
      select: {
        id: true,
        status: true,
      },
    });
    expect(transaction.reservation.updateMany).not.toHaveBeenCalled();
  });

  it('AC-039: permite apenas um cancelamento concorrente @spec:AC-039', async () => {
    let status: ReservationStatus = ReservationStatus.SCHEDULED;
    let queue = Promise.resolve();

    transaction.reservation.findFirst.mockImplementation(async () => ({
      id: reservationId,
      status,
    }));
    transaction.reservation.updateMany.mockImplementation(async () => {
      if (status !== ReservationStatus.SCHEDULED) {
        return { count: 0 };
      }
      status = ReservationStatus.CANCELLED;
      return { count: 1 };
    });
    transaction.reservation.findUnique.mockImplementation(async () => ({
      ...cancelledReservation,
      status,
    }));
    mockedPrisma.$transaction.mockImplementation((callback) => {
      const operation = queue.then(() => callback(transaction));
      queue = operation.then(() => undefined, () => undefined);
      return operation;
    });

    const [first, second] = await Promise.all([
      request(app)
        .patch(`/api/reservations/${reservationId}/cancel`)
        .set('Authorization', `Bearer ${token}`),
      request(app)
        .patch(`/api/reservations/${reservationId}/cancel`)
        .set('Authorization', `Bearer ${token}`),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 400]);
    expect(transaction.reservation.updateMany).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  });
});
