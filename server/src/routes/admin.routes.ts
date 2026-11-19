import { Router } from 'express';
import { Role } from '@prisma/client';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

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
  updateItemQuantity,
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
  listExtensionRequests,
  reviewExtensionRequest,
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
  updateItemQuantitySchema,
  toggleItemStatusSchema,
  createMaintenanceSchema,
  concludeMaintenanceSchema,
  pickupLoanSchema,
  noShowSchema,
  returnLoanSchema,
  updateSettingsSchema,
  toggleUserBlockSchema,
  reviewExtensionRequestSchema,
  getLoansHistorySchema,
} from '../schemas/admin.schema.js';

export const adminRouter = Router();

// Todas as rotas administrativas exigem autenticação e perfil ADMIN
adminRouter.use(authMiddleware, roleMiddleware([Role.ADMIN]));

// Categorias
adminRouter.get('/categories', asyncHandler(listAdminCategories));
adminRouter.post('/categories', validate(createCategorySchema), asyncHandler(createCategory));
adminRouter.put('/categories/:id', validate(updateCategorySchema), asyncHandler(updateCategory));
adminRouter.delete('/categories/:id', validate(deleteCategorySchema), asyncHandler(deleteCategory));

// Itens / Equipamentos
adminRouter.get('/items', asyncHandler(listAdminItems));
adminRouter.post('/items', validate(createItemSchema), asyncHandler(createItem));
adminRouter.put('/items/:id', validate(updateItemSchema), asyncHandler(updateItem));
adminRouter.patch('/items/:id/quantity', validate(updateItemQuantitySchema), asyncHandler(updateItemQuantity));
adminRouter.patch('/items/:id/status', validate(toggleItemStatusSchema), asyncHandler(toggleItemStatus));

// Manutenção
adminRouter.post('/items/:id/maintenance', validate(createMaintenanceSchema), asyncHandler(createMaintenance));
adminRouter.patch('/maintenance/:id/conclude', validate(concludeMaintenanceSchema), asyncHandler(concludeMaintenance));

// Dashboard Operacional Diário
adminRouter.get('/dashboard/daily-pickups', asyncHandler(getDailyPickups));
adminRouter.post('/loans/pickup', validate(pickupLoanSchema), asyncHandler(pickupLoan));
adminRouter.patch('/reservations/:id/no-show', validate(noShowSchema), asyncHandler(markNoShow));
adminRouter.get('/dashboard/daily-returns', asyncHandler(getDailyReturns));
adminRouter.post('/loans/:id/return', validate(returnLoanSchema), asyncHandler(returnLoan));

// Análise de Pedidos de Prazo Maior
adminRouter.get('/extension-requests', asyncHandler(listExtensionRequests));
adminRouter.patch(
  '/extension-requests/:id/review',
  validate(reviewExtensionRequestSchema),
  asyncHandler(reviewExtensionRequest)
);

// Histórico Geral de Empréstimos
adminRouter.get('/loans/history', validate(getLoansHistorySchema), asyncHandler(getLoansHistory));

// Configurações do Sistema (SystemSettings)
adminRouter.get('/settings', asyncHandler(getSettings));
adminRouter.put('/settings', validate(updateSettingsSchema), asyncHandler(updateSettings));

// Gestão de Usuários
adminRouter.get('/users', asyncHandler(listAdminUsers));
adminRouter.patch('/users/:id/toggle-block', validate(toggleUserBlockSchema), asyncHandler(toggleUserBlock));
