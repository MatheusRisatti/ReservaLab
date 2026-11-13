import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'O nome da categoria é obrigatório' }).min(2, 'O nome deve ter no mínimo 2 caracteres'),
    description: z.string().optional().nullable(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de categoria inválido'),
  }),
  body: z.object({
    name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres').optional(),
    description: z.string().optional().nullable(),
  }),
});

export const deleteCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de categoria inválido'),
  }),
});

export const createItemSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'O nome do equipamento é obrigatório' }).min(2, 'O nome deve ter no mínimo 2 caracteres'),
    patrimony_code: z.string({ required_error: 'O código de patrimônio é obrigatório' }).min(1, 'Código de patrimônio não pode ser vazio'),
    category_id: z.string({ required_error: 'A categoria é obrigatória' }).uuid('ID de categoria inválido'),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de equipamento inválido'),
  }),
  body: z.object({
    name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres').optional(),
    category_id: z.string().uuid('ID de categoria inválido').optional(),
    is_active: z.boolean().optional(),
  }),
});

export const toggleItemStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de equipamento inválido'),
  }),
  body: z.object({
    is_active: z.boolean({ required_error: 'O status ativo/inativo é obrigatório' }),
  }),
});

export const createMaintenanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de equipamento inválido'),
  }),
  body: z.object({
    description: z.string({ required_error: 'A descrição da manutenção é obrigatória' }).min(3, 'A descrição deve ter no mínimo 3 caracteres'),
    start_date: z.string().datetime({ message: 'Data de início inválida' }).optional(),
    end_date: z.string().datetime({ message: 'Data de término inválida' }).optional().nullable(),
  }),
});

export const concludeMaintenanceSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do registro de manutenção inválido'),
  }),
});

export const pickupLoanSchema = z.object({
  body: z.object({
    reservation_id: z.string({ required_error: 'O ID da reserva é obrigatório' }).uuid('ID de reserva inválido'),
  }),
});

export const noShowSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da reserva inválido'),
  }),
});

export const returnLoanSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID do empréstimo inválido'),
  }),
  body: z.object({
    return_observation: z.string().optional().nullable(),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    max_rent_days: z.number({ required_error: 'max_rent_days é obrigatório' }).int('Deve ser um número inteiro').positive('Deve ser maior que zero'),
    max_concurrent_items: z.number({ required_error: 'max_concurrent_items é obrigatório' }).int('Deve ser um número inteiro').positive('Deve ser maior que zero'),
  }),
});

export const toggleUserBlockSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de usuário inválido'),
  }),
});
