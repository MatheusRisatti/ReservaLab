import request from 'supertest';
import { ReservationStatus, Role } from '@prisma/client';
import { app } from '../../src/app.js';
import { prisma } from '../../src/services/prisma.js';
import { comparePassword, hashPassword } from '../../src/utils/hash.js';
import { generateToken, verifyToken } from '../../src/utils/token.js';

jest.mock('../../src/services/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    reservation: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    systemSettings: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/hash.js', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

const mockedPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  reservation: {
    findFirst: jest.Mock;
    count: jest.Mock;
  };
  systemSettings: {
    findFirst: jest.Mock;
  };
};

const mockedHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockedComparePassword = comparePassword as jest.MockedFunction<typeof comparePassword>;

const userId = '11111111-1111-4111-8111-111111111111';
const createdAt = new Date('2026-11-05T12:00:00.000Z');

const publicUser = {
  id: userId,
  name: 'Gustavo',
  email: 'gustavo@example.com',
  role: Role.USER,
  is_manually_blocked: false,
  created_at: createdAt,
};

const storedUser = {
  ...publicUser,
  password_hash: 'hash-seguro',
};

const userToken = generateToken({
  id: userId,
  email: publicUser.email,
  role: Role.USER,
});

describe('TASK-A01 — autenticação e status dinâmico do usuário', () => {
  it('AC-001: cria uma conta USER sem expor a senha @spec:AC-001', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedHashPassword.mockResolvedValue('hash-seguro');
    mockedPrisma.user.create.mockResolvedValue(publicUser);

    const response = await request(app).post('/api/auth/register').send({
      name: '  Gustavo  ',
      email: '  GUSTAVO@EXAMPLE.COM  ',
      password: '123456',
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: 'Gustavo',
      email: 'gustavo@example.com',
      role: Role.USER,
      is_manually_blocked: false,
    });
    expect(response.body.user).not.toHaveProperty('password_hash');
    expect(mockedPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Gustavo',
          email: 'gustavo@example.com',
          password_hash: 'hash-seguro',
          role: Role.USER,
          is_manually_blocked: false,
        }),
      })
    );
  });

  it('AC-002: recusa dados inválidos de cadastro @spec:AC-002', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'email-invalido',
      password: '123',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Dados inválidos na requisição');
    expect(response.body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'body.name' }),
        expect.objectContaining({ field: 'body.email' }),
        expect.objectContaining({ field: 'body.password' }),
      ])
    );
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
  });

  it('AC-003: recusa e-mail já cadastrado @spec:AC-003', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: userId });

    const response = await request(app).post('/api/auth/register').send({
      name: 'Gustavo',
      email: publicUser.email,
      password: '123456',
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('já está cadastrado');
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
  });

  it('AC-004: devolve token e dados públicos no login válido @spec:AC-004', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(storedUser);
    mockedComparePassword.mockResolvedValue(true);

    const response = await request(app).post('/api/auth/login').send({
      email: 'GUSTAVO@EXAMPLE.COM',
      password: '123456',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).not.toHaveProperty('password_hash');
    expect(verifyToken(response.body.token)).toMatchObject({
      id: userId,
      email: publicUser.email,
      role: Role.USER,
    });
  });

  it('AC-005: recusa e-mail inexistente e senha incorreta igualmente @spec:AC-005', async () => {
    mockedPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedUser);
    mockedComparePassword.mockResolvedValue(false);

    const unknownEmail = await request(app).post('/api/auth/login').send({
      email: 'desconhecido@example.com',
      password: '123456',
    });

    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: publicUser.email,
      password: 'senha-errada',
    });

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.body.error).toBe('E-mail ou senha inválidos');
    expect(wrongPassword.body.error).toBe('E-mail ou senha inválidos');
    expect(unknownEmail.body).not.toHaveProperty('token');
    expect(wrongPassword.body).not.toHaveProperty('token');
  });

  it('AC-006: protege a consulta pessoal sem token @spec:AC-006', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(mockedPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('AC-007: prioriza o bloqueio manual @spec:AC-007', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      ...publicUser,
      is_manually_blocked: true,
    });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('BLOCKED');
    expect(mockedPrisma.reservation.findFirst).not.toHaveBeenCalled();
    expect(mockedPrisma.reservation.count).not.toHaveBeenCalled();
  });

  it('AC-008: bloqueia usuário com empréstimo atrasado @spec:AC-008', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(publicUser);
    mockedPrisma.reservation.findFirst.mockResolvedValue({ id: 'reservation-id' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('BLOCKED');
    expect(mockedPrisma.reservation.findFirst).toHaveBeenCalledWith({
      where: {
        user_id: userId,
        status: ReservationStatus.ACTIVE_LOAN,
        expected_return_at: { lt: expect.any(Date) },
      },
      select: { id: true },
    });
  });

  it('AC-009: sinaliza quando o limite de reservas está atingido @spec:AC-009', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(publicUser);
    mockedPrisma.reservation.findFirst.mockResolvedValue(null);
    mockedPrisma.systemSettings.findFirst.mockResolvedValue({ max_concurrent_items: 2 });
    mockedPrisma.reservation.count.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('LIMIT_REACHED');
    expect(mockedPrisma.reservation.count).toHaveBeenCalledWith({
      where: {
        user_id: userId,
        status: {
          in: [ReservationStatus.SCHEDULED, ReservationStatus.ACTIVE_LOAN],
        },
      },
    });
  });

  it('AC-010: libera usuário sem impedimentos @spec:AC-010', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(publicUser);
    mockedPrisma.reservation.findFirst.mockResolvedValue(null);
    mockedPrisma.systemSettings.findFirst.mockResolvedValue({ max_concurrent_items: 3 });
    mockedPrisma.reservation.count.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('AVAILABLE');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });
});
