import request from 'supertest';
import { ReservationStatus, Role } from '@prisma/client';
import { app } from '../../src/app.js';
import { prisma } from '../../src/services/prisma.js';
import { comparePassword, hashPassword } from '../../src/utils/hash.js';

jest.mock('../../src/services/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    reservation: {
      findFirst: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    systemSettings: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/utils/hash.js', () => ({
  hashPassword: jest.fn(async (password: string) => `hash:${password}`),
  comparePassword: jest.fn(
    async (password: string, hash: string) => hash === `hash:${password}`
  ),
}));

type StoredUser = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  is_manually_blocked: boolean;
  created_at: Date;
};

type StoredReservation = {
  id: string;
  user_id: string;
  item_id: string;
  expected_pickup_at: Date;
  expected_return_at: Date;
  status: ReservationStatus;
  created_at: Date;
};

const mockedPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  reservation: {
    findFirst: jest.Mock;
    count: jest.Mock;
    findMany: jest.Mock;
  };
  systemSettings: {
    findFirst: jest.Mock;
  };
  $transaction: jest.Mock;
};
const mockedHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockedComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;

const userId = '11111111-1111-4111-8111-111111111111';
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
const settings = {
  max_rent_days: 14,
  max_concurrent_items: 1,
};

let storedUser: StoredUser | null;
let storedReservations: StoredReservation[];
let reservationSequence: number;

function selectFields<T extends Record<string, unknown>>(
  record: T,
  select?: Record<string, boolean>
): Partial<T> | T {
  if (!select) {
    return record;
  }

  return Object.fromEntries(
    Object.keys(select)
      .filter((field) => select[field])
      .map((field) => [field, record[field]])
  ) as Partial<T>;
}

function reservationWithDetails(reservation: StoredReservation) {
  return {
    ...reservation,
    item,
    loan: null,
  };
}

function matchesActiveStatus(status: ReservationStatus): boolean {
  return (
    status === ReservationStatus.SCHEDULED ||
    status === ReservationStatus.ACTIVE_LOAN
  );
}

function configureInMemoryPersistence(): void {
  storedUser = null;
  storedReservations = [];
  reservationSequence = 0;
  settings.max_rent_days = 14;
  settings.max_concurrent_items = 1;
  mockedHashPassword.mockImplementation(async (password) => `hash:${password}`);
  mockedComparePassword.mockImplementation(
    async (password, hash) => hash === `hash:${password}`
  );

  mockedPrisma.user.findUnique.mockImplementation(async ({ where, select }) => {
    if (!storedUser) {
      return null;
    }

    const matches =
      (where.email && where.email === storedUser.email) ||
      (where.id && where.id === storedUser.id);

    return matches ? selectFields(storedUser, select) : null;
  });

  mockedPrisma.user.create.mockImplementation(async ({ data, select }) => {
    storedUser = {
      id: userId,
      ...data,
      created_at: new Date(),
    } as StoredUser;

    return selectFields(storedUser, select);
  });

  mockedPrisma.systemSettings.findFirst.mockResolvedValue(settings);
  mockedPrisma.reservation.findFirst.mockImplementation(async ({ where }) => {
    return storedReservations.find((reservation) => {
      return (
        reservation.user_id === where.user_id &&
        reservation.status === ReservationStatus.ACTIVE_LOAN &&
        reservation.expected_return_at < where.expected_return_at.lt
      );
    }) ?? null;
  });
  mockedPrisma.reservation.count.mockImplementation(async ({ where }) => {
    return storedReservations.filter(
      (reservation) =>
        reservation.user_id === where.user_id && matchesActiveStatus(reservation.status)
    ).length;
  });
  mockedPrisma.reservation.findMany.mockImplementation(async ({ where }) => {
    return storedReservations
      .filter((reservation) => reservation.user_id === where.user_id)
      .sort((first, second) => second.created_at.getTime() - first.created_at.getTime())
      .map(reservationWithDetails);
  });

  const transaction = {
    systemSettings: {
      findFirst: jest.fn(async () => settings),
    },
    user: {
      findUnique: jest.fn(async ({ where, select }) => {
        if (!storedUser || storedUser.id !== where.id) {
          return null;
        }
        return selectFields(storedUser, select);
      }),
    },
    reservation: {
      findFirst: jest.fn(async ({ where }) => {
        if (where.id) {
          return storedReservations.find(
            (reservation) =>
              reservation.id === where.id && reservation.user_id === where.user_id
          ) ?? null;
        }

        if (where.item_id) {
          return storedReservations.find(
            (reservation) =>
              reservation.item_id === where.item_id &&
              matchesActiveStatus(reservation.status) &&
              reservation.expected_pickup_at < where.expected_pickup_at.lt &&
              reservation.expected_return_at > where.expected_return_at.gt
          ) ?? null;
        }

        return storedReservations.find(
          (reservation) =>
            reservation.user_id === where.user_id &&
            reservation.status === ReservationStatus.ACTIVE_LOAN &&
            reservation.expected_return_at < where.expected_return_at.lt
        ) ?? null;
      }),
      count: jest.fn(async ({ where }) => {
        return storedReservations.filter(
          (reservation) =>
            reservation.user_id === where.user_id && matchesActiveStatus(reservation.status)
        ).length;
      }),
      create: jest.fn(async ({ data }) => {
        reservationSequence += 1;
        const reservation: StoredReservation = {
          id: `44444444-4444-4444-8444-${String(reservationSequence).padStart(12, '0')}`,
          ...data,
          created_at: new Date(),
        };
        storedReservations.push(reservation);
        return reservation;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const reservation = storedReservations.find(
          (candidate) =>
            candidate.id === where.id &&
            candidate.user_id === where.user_id &&
            candidate.status === where.status
        );

        if (!reservation) {
          return { count: 0 };
        }

        reservation.status = data.status;
        return { count: 1 };
      }),
      findUnique: jest.fn(async ({ where }) => {
        const reservation = storedReservations.find(
          (candidate) => candidate.id === where.id
        );
        return reservation ? reservationWithDetails(reservation) : null;
      }),
    },
    item: {
      findUnique: jest.fn(async ({ where }) => {
        return where.id === item.id ? { id: item.id, is_active: item.is_active } : null;
      }),
    },
    maintenanceRecord: {
      findFirst: jest.fn(async () => null),
    },
  };

  mockedPrisma.$transaction.mockImplementation(async (callback) => callback(transaction));
}

function futurePeriod(rentDays = 2) {
  const pickupDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const returnDate = new Date(pickupDate.getTime() + rentDays * 24 * 60 * 60 * 1000);

  return {
    item_id: item.id,
    expected_pickup_at: pickupDate.toISOString(),
    expected_return_at: returnDate.toISOString(),
  };
}

async function registerAndLogin() {
  const registration = await request(app).post('/api/auth/register').send({
    name: 'Gustavo',
    email: 'gustavo@example.com',
    password: '123456',
  });
  const login = await request(app).post('/api/auth/login').send({
    email: 'gustavo@example.com',
    password: '123456',
  });

  expect(registration.status).toBe(201);
  expect(login.status).toBe(200);

  return {
    registration,
    login,
    token: login.body.token as string,
  };
}

describe('TASK-A05 — jornada integrada do usuário', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureInMemoryPersistence();
  });

  it('AC-040: cadastra e autentica o mesmo usuário @spec:AC-040', async () => {
    const { registration, login, token } = await registerAndLogin();

    expect(registration.body.user).toMatchObject({
      id: userId,
      email: 'gustavo@example.com',
      role: Role.USER,
    });
    expect(registration.body.user).not.toHaveProperty('password_hash');
    expect(login.body.user).not.toHaveProperty('password_hash');
    expect(token).toEqual(expect.any(String));
  });

  it('AC-041: muda de AVAILABLE para LIMIT_REACHED após reservar @spec:AC-041', async () => {
    const { token } = await registerAndLogin();

    const beforeReservation = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    const creation = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod());
    const afterReservation = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(beforeReservation.status).toBe(200);
    expect(beforeReservation.body.status).toBe('AVAILABLE');
    expect(creation.status).toBe(201);
    expect(afterReservation.status).toBe(200);
    expect(afterReservation.body.status).toBe('LIMIT_REACHED');
  });

  it('AC-042: cria reserva e a encontra no próprio histórico @spec:AC-042', async () => {
    const { token } = await registerAndLogin();
    const creation = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod());
    const history = await request(app)
      .get('/api/reservations/my-reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(creation.status).toBe(201);
    expect(creation.body.reservation).toMatchObject({
      user_id: userId,
      item_id: item.id,
      status: ReservationStatus.SCHEDULED,
    });
    expect(history.status).toBe(200);
    expect(history.body.reservations).toHaveLength(1);
    expect(history.body.reservations[0]).toMatchObject({
      id: creation.body.reservation.id,
      user_id: userId,
      item: { id: item.id, category },
    });
  });

  it('AC-043: bloqueia a segunda reserva sobreposta com 409 @spec:AC-043', async () => {
    const { token } = await registerAndLogin();
    const period = futurePeriod();
    const first = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(period);

    settings.max_concurrent_items = 2;
    const conflicting = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(period);
    settings.max_concurrent_items = 1;

    expect(first.status).toBe(201);
    expect(conflicting.status).toBe(409);
    expect(storedReservations).toHaveLength(1);
  });

  it('AC-044: bloqueia reserva acima de 14 dias com 400 @spec:AC-044', async () => {
    const { token } = await registerAndLogin();
    const response = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod(15));

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('14 dias');
    expect(storedReservations).toHaveLength(0);
  });

  it('AC-045: cancela reserva própria e atualiza o histórico @spec:AC-045', async () => {
    const { token } = await registerAndLogin();
    const creation = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send(futurePeriod());
    const cancellation = await request(app)
      .patch(`/api/reservations/${creation.body.reservation.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    const history = await request(app)
      .get('/api/reservations/my-reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(creation.status).toBe(201);
    expect(cancellation.status).toBe(200);
    expect(cancellation.body.reservation.status).toBe(ReservationStatus.CANCELLED);
    expect(history.status).toBe(200);
    expect(history.body.reservations[0].status).toBe(ReservationStatus.CANCELLED);
  });
});
