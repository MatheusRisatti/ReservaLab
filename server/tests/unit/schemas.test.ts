import { loginSchema, registerSchema } from '../../src/schemas/auth.schema.js';
import { createReservationSchema } from '../../src/schemas/reservation.schema.js';
import {
  getLoansHistorySchema,
  reviewExtensionRequestSchema,
  updateItemQuantitySchema,
} from '../../src/schemas/admin.schema.js';

describe('Unit — Validação dos Schemas Zod', () => {
  describe('auth.schema', () => {
    it('aceita dados válidos de cadastro e login', () => {
      expect(
        registerSchema.safeParse({
          body: { name: 'Matheus', email: 'matheus@reservalab.com', password: '123456' },
        }).success
      ).toBe(true);

      expect(
        loginSchema.safeParse({
          body: { email: 'matheus@reservalab.com', password: '123456' },
        }).success
      ).toBe(true);
    });

    it('rejeita senha curta, nome vazio e e-mail inválido no cadastro', () => {
      const result = registerSchema.safeParse({
        body: { name: '   ', email: 'invalido', password: '123' },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('reservation.schema', () => {
    const validItemId = '33333333-3333-4333-8333-333333333333';

    it('aceita reserva futura válida com justificativa opcional', () => {
      const pickup = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const ret = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

      const result = createReservationSchema.safeParse({
        body: {
          item_id: validItemId,
          expected_pickup_at: pickup,
          expected_return_at: ret,
          request_reason: 'Necessário para projeto do laboratório de robótica.',
        },
      });

      expect(result.success).toBe(true);
    });

    it('rejeita retirada no passado, devolução invertida e justificativa menor que 5 chars', () => {
      const past = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      expect(
        createReservationSchema.safeParse({
          body: {
            item_id: validItemId,
            expected_pickup_at: past,
            expected_return_at: future,
          },
        }).success
      ).toBe(false);

      expect(
        createReservationSchema.safeParse({
          body: {
            item_id: validItemId,
            expected_pickup_at: future,
            expected_return_at: past,
          },
        }).success
      ).toBe(false);

      expect(
        createReservationSchema.safeParse({
          body: {
            item_id: validItemId,
            expected_pickup_at: future,
            expected_return_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            request_reason: 'curt',
          },
        }).success
      ).toBe(false);
    });
  });

  describe('admin.schema', () => {
    const validId = '44444444-4444-4444-8444-444444444444';

    it('exige justificativa obrigatória ao reprovar solicitação de prazo maior', () => {
      const approveWithoutReason = reviewExtensionRequestSchema.safeParse({
        params: { id: validId },
        body: { action: 'APPROVE' },
      });
      const rejectWithoutReason = reviewExtensionRequestSchema.safeParse({
        params: { id: validId },
        body: { action: 'REJECT', decision_reason: '  ' },
      });
      const rejectWithReason = reviewExtensionRequestSchema.safeParse({
        params: { id: validId },
        body: { action: 'REJECT', decision_reason: 'Uso reservado para turma A' },
      });

      expect(approveWithoutReason.success).toBe(true);
      expect(rejectWithoutReason.success).toBe(false);
      expect(rejectWithReason.success).toBe(true);
    });

    it('valida quantidade inteira positiva (>= 1) em updateItemQuantitySchema', () => {
      expect(
        updateItemQuantitySchema.safeParse({
          params: { id: validId },
          body: { quantity: 3 },
        }).success
      ).toBe(true);

      expect(
        updateItemQuantitySchema.safeParse({
          params: { id: validId },
          body: { quantity: 0 },
        }).success
      ).toBe(false);

      expect(
        updateItemQuantitySchema.safeParse({
          params: { id: validId },
          body: { quantity: 1.5 },
        }).success
      ).toBe(false);
    });

    it('valida query status em getLoansHistorySchema', () => {
      expect(getLoansHistorySchema.safeParse({ query: { status: '' } }).success).toBe(true);
      expect(
        getLoansHistorySchema.safeParse({ query: { status: 'COMPLETED' } }).success
      ).toBe(true);
      expect(
        getLoansHistorySchema.safeParse({ query: { status: 'DESCONHECIDO' } }).success
      ).toBe(false);
    });
  });
});
