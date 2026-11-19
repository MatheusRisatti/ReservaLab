import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status?: number }).status === 400
  ) {
    res.status(400).json({ error: 'Corpo da requisição contém JSON inválido' });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Já existe um registro cadastrado com os dados informados' });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Registro não encontrado' });
      return;
    }

    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Operação inválida: referência a registro inexistente ou vinculado' });
      return;
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Erro inesperado:', err);
  }
  res.status(500).json({ error: 'Erro interno do servidor' });
}
