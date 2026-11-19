import { NextFunction, Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../../src/middlewares/auth.middleware.js';
import { roleMiddleware } from '../../src/middlewares/role.middleware.js';
import { validate } from '../../src/middlewares/validate.middleware.js';
import { AppError, errorMiddleware } from '../../src/middlewares/error.middleware.js';
import { generateToken } from '../../src/utils/token.js';

function createMockResponse() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('Unit — Middlewares da API', () => {
  describe('authMiddleware', () => {
    it('retorna 401 quando o cabeçalho Authorization está ausente', () => {
      const req = { headers: {} } as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token de autenticação não fornecido',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('retorna 401 quando o formato do token não é Bearer', () => {
      const req = { headers: { authorization: 'Basic abc123' } } as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Formato de token inválido. Esperado: Bearer <token>',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('retorna 401 quando o token é inválido ou expirado', () => {
      const req = { headers: { authorization: 'Bearer token.invalido.aqui' } } as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token inválido ou expirado',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('anexa req.user e chama next quando o token Bearer é válido', () => {
      const token = generateToken({
        id: '11111111-1111-4111-8111-111111111111',
        email: 'user@reservalab.com',
        role: Role.USER,
      });
      const req = { headers: { authorization: `Bearer ${token}` } } as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      authMiddleware(req, res, next);

      expect(req.user).toMatchObject({
        id: '11111111-1111-4111-8111-111111111111',
        email: 'user@reservalab.com',
        role: Role.USER,
      });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('roleMiddleware', () => {
    it('retorna 401 quando req.user não foi autenticado', () => {
      const middleware = roleMiddleware([Role.ADMIN]);
      const req = {} as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('retorna 403 quando o perfil não possui permissão', () => {
      const middleware = roleMiddleware([Role.ADMIN]);
      const req = {
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'user@reservalab.com',
          role: Role.USER,
        },
      } as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Acesso negado: permissões insuficientes',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('chama next quando o perfil está autorizado', () => {
      const middleware = roleMiddleware([Role.ADMIN]);
      const req = {
        user: {
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          email: 'admin@reservalab.com',
          role: Role.ADMIN,
        },
      } as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('validate middleware', () => {
    const sampleSchema = z.object({
      body: z.object({
        name: z.string().min(2, 'Nome curto'),
      }),
    });

    it('chama next quando os dados satisfazem o schema Zod', async () => {
      const middleware = validate(sampleSchema);
      const req = { body: { name: 'Notebook' }, query: {}, params: {} } as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('retorna 400 com lista de issues quando a validação Zod falha', async () => {
      const middleware = validate(sampleSchema);
      const req = { body: { name: 'A' }, query: {}, params: {} } as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Dados inválidos na requisição',
        issues: [{ field: 'body.name', message: 'Nome curto' }],
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('errorMiddleware', () => {
    it('retorna status e mensagem de AppError', () => {
      const req = {} as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      errorMiddleware(new AppError('Conflito de agenda', 409), req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ error: 'Conflito de agenda' });
    });

    it('retorna 400 para corpo JSON malformado (SyntaxError)', () => {
      const req = {} as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;
      const jsonSyntaxError = Object.assign(new SyntaxError('Unexpected token'), {
        status: 400,
      });

      errorMiddleware(jsonSyntaxError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Corpo da requisição contém JSON inválido',
      });
    });

    it('mapeia erros conhecidos do Prisma (P2002, P2025 e P2003)', () => {
      const req = {} as Request;
      const next = jest.fn() as NextFunction;

      const resConflict = createMockResponse();
      const errP2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.22.0',
      });
      errorMiddleware(errP2002, req, resConflict, next);
      expect(resConflict.status).toHaveBeenCalledWith(409);

      const resNotFound = createMockResponse();
      const errP2025 = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.22.0',
      });
      errorMiddleware(errP2025, req, resNotFound, next);
      expect(resNotFound.status).toHaveBeenCalledWith(404);

      const resFk = createMockResponse();
      const errP2003 = new Prisma.PrismaClientKnownRequestError('Foreign key', {
        code: 'P2003',
        clientVersion: '5.22.0',
      });
      errorMiddleware(errP2003, req, resFk, next);
      expect(resFk.status).toHaveBeenCalledWith(400);
    });

    it('retorna 500 para exceções genéricas não tratadas', () => {
      const req = {} as Request;
      const res = createMockResponse();
      const next = jest.fn() as NextFunction;

      errorMiddleware(new Error('Falha inesperada de rede'), req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
    });
  });
});
