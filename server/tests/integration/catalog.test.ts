import request from 'supertest';
import { ReservationStatus } from '@prisma/client';
import { app } from '../../src/app.js';
import { prisma } from '../../src/services/prisma.js';

jest.mock('../../src/services/prisma.js', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
    },
    item: {
      findMany: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  category: {
    findMany: jest.Mock;
  };
  item: {
    findMany: jest.Mock;
  };
};

const category = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Notebooks',
  description: 'Computadores portáteis',
};

const catalogItem = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Notebook Dell',
  patrimony_code: 'PAT-001',
  is_active: true,
  category_id: category.id,
  category,
};

describe('TASK-A02 — catálogo e disponibilidade de equipamentos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AC-011: lista todas as categorias @spec:AC-011', async () => {
    mockedPrisma.category.findMany.mockResolvedValue([category]);

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body.categories).toEqual([category]);
    expect(mockedPrisma.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });

  it('AC-012: lista somente equipamentos ativos com categoria @spec:AC-012', async () => {
    mockedPrisma.item.findMany.mockResolvedValue([
      { ...catalogItem, reservations: [], maintenance: [] },
    ]);

    const response = await request(app).get('/api/items');

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toMatchObject({
      ...catalogItem,
      is_available: true,
    });
    expect(response.body.items[0]).not.toHaveProperty('reservations');
    expect(response.body.items[0]).not.toHaveProperty('maintenance');
    expect(mockedPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { is_active: true },
        include: expect.objectContaining({ category: true }),
      })
    );
  });

  it('AC-013: filtra equipamentos ativos por categoria @spec:AC-013', async () => {
    mockedPrisma.item.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/items')
      .query({ category_id: category.id });

    expect(response.status).toBe(200);
    expect(mockedPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          is_active: true,
          category_id: category.id,
        },
      })
    );
  });

  it('AC-014: marca item com reserva sobreposta como indisponível @spec:AC-014', async () => {
    mockedPrisma.item.findMany.mockResolvedValue([
      { ...catalogItem, reservations: [{ id: 'reservation-id' }], maintenance: [] },
    ]);

    const response = await request(app).get('/api/items').query({
      pickup_date: '2026-11-10T10:00:00.000Z',
      return_date: '2026-11-12T10:00:00.000Z',
    });

    expect(response.status).toBe(200);
    expect(response.body.items[0].is_available).toBe(false);
    expect(mockedPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          reservations: {
            where: {
              status: {
                in: [ReservationStatus.SCHEDULED, ReservationStatus.ACTIVE_LOAN],
              },
              expected_pickup_at: { lt: new Date('2026-11-12T10:00:00.000Z') },
              expected_return_at: { gt: new Date('2026-11-10T10:00:00.000Z') },
            },
            select: { id: true },
            take: 1,
          },
        }),
      })
    );
  });

  it('AC-015: marca item com manutenção sobreposta como indisponível @spec:AC-015', async () => {
    mockedPrisma.item.findMany.mockResolvedValue([
      { ...catalogItem, reservations: [], maintenance: [{ id: 'maintenance-id' }] },
    ]);

    const response = await request(app).get('/api/items').query({
      pickup_date: '2026-11-10T10:00:00.000Z',
      return_date: '2026-11-12T10:00:00.000Z',
    });

    expect(response.status).toBe(200);
    expect(response.body.items[0].is_available).toBe(false);
    expect(mockedPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          maintenance: {
            where: {
              start_date: { lt: new Date('2026-11-12T10:00:00.000Z') },
              OR: [
                { end_date: null },
                { end_date: { gt: new Date('2026-11-10T10:00:00.000Z') } },
              ],
            },
            select: { id: true },
            take: 1,
          },
        }),
      })
    );
  });

  it('AC-016: marca item sem conflito como disponível @spec:AC-016', async () => {
    mockedPrisma.item.findMany.mockResolvedValue([
      { ...catalogItem, reservations: [], maintenance: [] },
    ]);

    const response = await request(app).get('/api/items').query({
      pickup_date: '2026-11-10T10:00:00.000Z',
      return_date: '2026-11-12T10:00:00.000Z',
    });

    expect(response.status).toBe(200);
    expect(response.body.items[0].is_available).toBe(true);
  });

  it('AC-017: recusa período incompleto, inválido ou invertido @spec:AC-017', async () => {
    const incomplete = await request(app)
      .get('/api/items')
      .query({ pickup_date: '2026-11-10T10:00:00.000Z' });
    const invalid = await request(app).get('/api/items').query({
      pickup_date: 'data-invalida',
      return_date: '2026-11-12T10:00:00.000Z',
    });
    const inverted = await request(app).get('/api/items').query({
      pickup_date: '2026-11-12T10:00:00.000Z',
      return_date: '2026-11-10T10:00:00.000Z',
    });

    expect(incomplete.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(inverted.status).toBe(400);
    expect(mockedPrisma.item.findMany).not.toHaveBeenCalled();
  });

  it('AC-018: sem período usa empréstimo ativo e manutenção aberta @spec:AC-018', async () => {
    mockedPrisma.item.findMany.mockResolvedValue([
      { ...catalogItem, reservations: [{ id: 'active-loan-id' }], maintenance: [] },
    ]);

    const response = await request(app).get('/api/items');

    expect(response.status).toBe(200);
    expect(response.body.items[0].is_available).toBe(false);
    expect(mockedPrisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          reservations: {
            where: { status: ReservationStatus.ACTIVE_LOAN },
            select: { id: true },
            take: 1,
          },
          maintenance: {
            where: { end_date: null },
            select: { id: true },
            take: 1,
          },
        }),
      })
    );
  });
});
