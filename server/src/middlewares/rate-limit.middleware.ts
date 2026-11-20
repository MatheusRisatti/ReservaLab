import rateLimit from 'express-rate-limit';

type AuthRateLimiterOptions = {
  windowMs?: number;
  limit?: number;
};

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 20;

function numberFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Limita tentativas de cadastro e login por IP para dificultar ataques de força bruta.
 * Os valores padrão podem ser ajustados por AUTH_RATE_LIMIT_WINDOW_MS e AUTH_RATE_LIMIT_MAX.
 * Nos testes automatizados o limitador é ignorado, exceto quando recebe opções explícitas.
 */
export function createAuthRateLimiter(options?: AuthRateLimiterOptions) {
  return rateLimit({
    windowMs: options?.windowMs ?? numberFromEnv('AUTH_RATE_LIMIT_WINDOW_MS', DEFAULT_WINDOW_MS),
    limit: options?.limit ?? numberFromEnv('AUTH_RATE_LIMIT_MAX', DEFAULT_LIMIT),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !options && process.env.NODE_ENV === 'test',
    message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
  });
}
