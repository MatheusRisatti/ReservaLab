import request from 'supertest';
import { ReservationStatus, Role } from '@prisma/client';
import { app } from '../../src/app.js';
import { prisma } from '../../src/services/prisma.js';
import { generateToken } from '../../src/utils/token.js';

jest.mock('../../src/services/prisma.js', () => ({
  prisma: {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    item: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    maintenanceRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    loan: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    systemSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((promises: any[]) => Promise.all(promises)),
  },
}));

const mockedPrisma = prisma as any;

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

describe('TRILHA B — Módulo do Administrador', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Segurança e Controle de Acesso', () => {
    it('deve retornar 401 se nenhum token for fornecido', async () => {
      const response = await request(app).get('/api/admin/categories');
      expect(response.status).toBe(401);
    });

    it('deve retornar 403 se o usuário não tiver role ADMIN', async () => {
      const response = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Acesso negado: permissões insuficientes');
    });
  });

  describe('TASK-B01 — CRUD de Categorias e Equipamentos', () => {
    const categoryId = '11111111-1111-4111-8111-111111111111';
    const sampleCategory = {
      id: categoryId,
      name: 'Notebooks',
      description: 'Portáteis',
    };

    it('deve criar uma nova categoria com sucesso', async () => {
      mockedPrisma.category.findUnique.mockResolvedValue(null);
      mockedPrisma.category.create.mockResolvedValue(sampleCategory);

      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Notebooks', description: 'Portáteis' });

      expect(response.status).toBe(201);
      expect(response.body.category).toEqual(sampleCategory);
    });

    it('deve retornar 409 se nome da categoria já existir', async () => {
      mockedPrisma.category.findUnique.mockResolvedValue(sampleCategory);

      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Notebooks' });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Já existe uma categoria cadastrada');
    });

    it('deve impedir exclusão de categoria com equipamentos vinculados (400)', async () => {
      mockedPrisma.category.findUnique.mockResolvedValue(sampleCategory);
      mockedPrisma.item.count.mockResolvedValue(3);

      const response = await request(app)
        .delete(`/api/admin/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Não é possível remover categoria');
    });

    it('deve criar um novo equipamento com patrimônio único', async () => {
      const sampleItem = {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Dell Latitude 3420',
        patrimony_code: 'PAT-999',
        category_id: categoryId,
        is_active: true,
      };

      mockedPrisma.category.findUnique.mockResolvedValue(sampleCategory);
      mockedPrisma.item.findUnique.mockResolvedValue(null);
      mockedPrisma.item.create.mockResolvedValue(sampleItem);

      const response = await request(app)
        .post('/api/admin/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dell Latitude 3420',
          patrimony_code: 'PAT-999',
          category_id: categoryId,
        });

      expect(response.status).toBe(201);
      expect(response.body.item).toEqual(sampleItem);
    });

    it('deve retornar 409 se patrimônio já existir', async () => {
      mockedPrisma.category.findUnique.mockResolvedValue(sampleCategory);
      mockedPrisma.item.findUnique.mockResolvedValue({ id: 'exists' });

      const response = await request(app)
        .post('/api/admin/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Item Duplicado',
          patrimony_code: 'PAT-DUPLICADO',
          category_id: categoryId,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Já existe um equipamento cadastrado com este código');
    });
  });

  describe('TASK-B02 — Gestão de Manutenção de Equipamentos', () => {
    const itemId = '22222222-2222-4222-8222-222222222222';

    it('deve impedir envio para manutenção se houver empréstimo ativo no momento', async () => {
      mockedPrisma.item.findUnique.mockResolvedValue({ id: itemId, name: 'Item' });
      mockedPrisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        status: ReservationStatus.ACTIVE_LOAN,
      });

      const response = await request(app)
        .post(`/api/admin/items/${itemId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Tela trincada' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('empréstimo ativo em andamento');
    });

    it('deve registrar manutenção com sucesso', async () => {
      mockedPrisma.item.findUnique.mockResolvedValue({ id: itemId, name: 'Item' });
      mockedPrisma.reservation.findFirst.mockResolvedValue(null);
      mockedPrisma.maintenanceRecord.create.mockResolvedValue({
        id: 'maint-1',
        item_id: itemId,
        description: 'Troca de pasta térmica',
      });

      const response = await request(app)
        .post(`/api/admin/items/${itemId}/maintenance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Troca de pasta térmica' });

      expect(response.status).toBe(201);
      expect(response.body.maintenance).toHaveProperty('id', 'maint-1');
    });
  });

  describe('TASK-B03 & B04 — Painel Operacional Diário (Retiradas, Devoluções e No-Show)', () => {
    const resId = '33333333-3333-4333-8333-333333333333';

    it('deve confirmar retirada criando Loan e mudando status para ACTIVE_LOAN', async () => {
      mockedPrisma.reservation.findUnique.mockResolvedValue({
        id: resId,
        status: ReservationStatus.SCHEDULED,
        loan: null,
      });

      const createdLoan = { id: 'loan-1', reservation_id: resId };
      const updatedReservation = { id: resId, status: ReservationStatus.ACTIVE_LOAN };

      mockedPrisma.$transaction.mockResolvedValue([createdLoan, updatedReservation]);

      const response = await request(app)
        .post('/api/admin/loans/pickup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reservation_id: resId });

      expect(response.status).toBe(201);
      expect(response.body.loan).toEqual(createdLoan);
      expect(response.body.reservation.status).toBe(ReservationStatus.ACTIVE_LOAN);
    });

    it('deve marcar reserva como NO_SHOW', async () => {
      mockedPrisma.reservation.findUnique.mockResolvedValue({
        id: resId,
        status: ReservationStatus.SCHEDULED,
      });
      mockedPrisma.reservation.update.mockResolvedValue({
        id: resId,
        status: ReservationStatus.NO_SHOW,
      });

      const response = await request(app)
        .patch(`/api/admin/reservations/${resId}/no-show`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reservation.status).toBe(ReservationStatus.NO_SHOW);
    });

    it('deve registrar devolução com observação textual e mudar status para COMPLETED', async () => {
      const loanId = '44444444-4444-4444-8444-444444444444';
      mockedPrisma.loan.findFirst.mockResolvedValue({
        id: loanId,
        reservation_id: resId,
        actual_return_at: null,
      });

      const updatedLoan = {
        id: loanId,
        return_observation: 'Equipamento devolvido com cabo desgastado',
        actual_return_at: new Date(),
      };
      const updatedReservation = { id: resId, status: ReservationStatus.COMPLETED };

      mockedPrisma.$transaction.mockResolvedValue([updatedLoan, updatedReservation]);

      const response = await request(app)
        .post(`/api/admin/loans/${loanId}/return`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ return_observation: 'Equipamento devolvido com cabo desgastado' });

      expect(response.status).toBe(200);
      expect(response.body.loan.return_observation).toBe('Equipamento devolvido com cabo desgastado');
      expect(response.body.reservation.status).toBe(ReservationStatus.COMPLETED);
    });
  });

  describe('TASK-B05 — Configurações de Regras e Gestão de Usuários', () => {
    it('deve consultar e atualizar SystemSettings', async () => {
      mockedPrisma.systemSettings.findFirst.mockResolvedValue({
        id: 'settings-1',
        max_rent_days: 14,
        max_concurrent_items: 3,
      });
      mockedPrisma.systemSettings.update.mockResolvedValue({
        id: 'settings-1',
        max_rent_days: 7,
        max_concurrent_items: 2,
      });

      const getRes = await request(app)
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.settings.max_rent_days).toBe(14);

      const putRes = await request(app)
        .put('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ max_rent_days: 7, max_concurrent_items: 2 });

      expect(putRes.status).toBe(200);
      expect(putRes.body.settings.max_rent_days).toBe(7);
      expect(putRes.body.settings.max_concurrent_items).toBe(2);
    });

    it('deve alternar o bloqueio manual de usuário (is_manually_blocked)', async () => {
      const targetUserId = '55555555-5555-4555-8555-555555555555';
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: targetUserId,
        name: 'Aluno Teste',
        is_manually_blocked: false,
      });
      mockedPrisma.user.update.mockResolvedValue({
        id: targetUserId,
        name: 'Aluno Teste',
        is_manually_blocked: true,
      });

      const response = await request(app)
        .patch(`/api/admin/users/${targetUserId}/toggle-block`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.is_manually_blocked).toBe(true);
    });
  });
});
