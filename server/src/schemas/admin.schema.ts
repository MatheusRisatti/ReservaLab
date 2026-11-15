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
    quantity: z.number().int('A quantidade deve ser um número inteiro').min(1, 'A quantidade mínima é 1').optional(),
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
    quantity: z.number().int('A quantidade deve ser um número inteiro').min(1, 'A quantidade mínima é 1').optional(),
  }),
});

export const updateItemQuantitySchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de equipamento inválido'),
  }),
  body: z.object({
    quantity: z
      .number({ required_error: 'A quantidade é obrigatória' })
      .int('A quantidade deve ser um número inteiro')
      .min(1, 'A quantidade mínima permitida é 1 unidade'),
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

export const reviewExtensionRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da solicitação inválido'),
  }),
  body: z
    .object({
      action: z.enum(['APPROVE', 'REJECT'], {
        required_error: 'A ação (APPROVE ou REJECT) é obrigatória',
      }),
      decision_reason: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
      if (data.action === 'REJECT' && (!data.decision_reason || data.decision_reason.trim().length < 3)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['decision_reason'],
          message: 'A justificativa é obrigatória ao reprovar uma solicitação (mínimo de 3 caracteres)',
        });
      }
    }),
});
