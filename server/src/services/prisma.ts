import { PrismaClient } from '@prisma/client';

function normalizeDatabaseUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    if (parsedUrl.port === '6543' && !parsedUrl.searchParams.has('pgbouncer')) {
      parsedUrl.searchParams.set('pgbouncer', 'true');
    }
    return parsedUrl.toString();
  } catch {
    return rawUrl;
  }
}

const datasourceUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

export const prisma = new PrismaClient({
  ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  transactionOptions: {
    maxWait: 10000,
    timeout: 30000,
  },
});

