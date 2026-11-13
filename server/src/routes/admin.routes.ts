import { Router } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

import {
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/admin/category.controller.js';

import {
  listAdminItems,
  createItem,
  updateItem,
  toggleItemStatus,
} from '../controllers/admin/item.controller.js';

import {
  createMaintenance,
  concludeMaintenance,
} from '../controllers/admin/maintenance.controller.js';

import {
  getDailyPickups,
  getDailyReturns,
} from '../controllers/admin/dashboard.controller.js';

import {
  pickupLoan,
  markNoShow,
  returnLoan,
  getLoansHistory,
} from '../controllers/admin/loan.controller.js';

import {
  getSettings,
  updateSettings,
} from '../controllers/admin/settings.controller.js';

import {
  listAdminUsers,
  toggleUserBlock,
} from '../controllers/admin/user-admin.controller.js';

import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  createItemSchema,
  updateItemSchema,
  toggleItemStatusSchema,
  createMaintenanceSchema,
  concludeMaintenanceSchema,
  pickupLoanSchema,
  noShowSchema,
  returnLoanSchema,
  updateSettingsSchema,
  toggleUserBlockSchema,
} from '../schemas/admin.schema.js';

export const adminRouter = Router();

// Todas as rotas administrativas exigem autenticação e perfil ADMIN
adminRouter.use(authMiddleware, roleMiddleware([Role.ADMIN]));

// Categorias
adminRouter.get('/categories', listAdminCategories);
adminRouter.post('/categories', validate(createCategorySchema), createCategory);
adminRouter.put('/categories/:id', validate(updateCategorySchema), updateCategory);
adminRouter.delete('/categories/:id', validate(deleteCategorySchema), deleteCategory);

// Itens / Equipamentos
adminRouter.get('/items', listAdminItems);
adminRouter.post('/items', validate(createItemSchema), createItem);
adminRouter.put('/items/:id', validate(updateItemSchema), updateItem);
adminRouter.patch('/items/:id/status', validate(toggleItemStatusSchema), toggleItemStatus);

// Manutenção
adminRouter.post('/items/:id/maintenance', validate(createMaintenanceSchema), createMaintenance);
adminRouter.patch('/maintenance/:id/conclude', validate(concludeMaintenanceSchema), concludeMaintenance);

// Dashboard Operacional Diário
adminRouter.get('/dashboard/daily-pickups', getDailyPickups);
adminRouter.post('/loans/pickup', validate(pickupLoanSchema), pickupLoan);
adminRouter.patch('/reservations/:id/no-show', validate(noShowSchema), markNoShow);
adminRouter.get('/dashboard/daily-returns', getDailyReturns);
adminRouter.post('/loans/:id/return', validate(returnLoanSchema), returnLoan);

// Histórico Geral de Empréstimos
adminRouter.get('/loans/history', getLoansHistory);

// Configurações do Sistema (SystemSettings)
adminRouter.get('/settings', getSettings);
adminRouter.put('/settings', validate(updateSettingsSchema), updateSettings);

// Gestão de Usuários
adminRouter.get('/users', listAdminUsers);
adminRouter.patch('/users/:id/toggle-block', validate(toggleUserBlockSchema), toggleUserBlock);
