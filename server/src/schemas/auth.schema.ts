import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'O nome é obrigatório'),
    email: z.string().trim().email('Informe um e-mail válido'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Informe um e-mail válido'),
    password: z.string().min(1, 'A senha é obrigatória'),
  }),
});
