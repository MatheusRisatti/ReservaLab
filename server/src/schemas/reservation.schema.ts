import { z } from 'zod';

const reservationBodySchema = z
  .object({
    item_id: z.string().uuid('Identificador de equipamento inválido'),
    expected_pickup_at: z.string().datetime({
      offset: true,
      message: 'Data de retirada inválida',
    }),
    expected_return_at: z.string().datetime({
      offset: true,
      message: 'Data de devolução inválida',
    }),
    request_reason: z
      .string()
      .trim()
      .min(5, 'A justificativa para prazo estendido deve ter pelo menos 5 caracteres')
      .max(1000, 'A justificativa não pode ultrapassar 1000 caracteres')
      .optional(),
  })
  .superRefine((data, context) => {
    const pickupDate = new Date(data.expected_pickup_at);
    const returnDate = new Date(data.expected_return_at);

    if (pickupDate <= new Date()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expected_pickup_at'],
        message: 'A retirada deve estar no futuro',
      });
    }

    if (returnDate <= pickupDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expected_return_at'],
        message: 'A devolução deve ser posterior à retirada',
      });
    }
  });

export const createReservationSchema = z.object({
  body: reservationBodySchema,
});

export const cancelReservationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Identificador de reserva inválido'),
  }),
});
