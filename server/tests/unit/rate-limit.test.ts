import express from 'express';
import request from 'supertest';
import { createAuthRateLimiter } from '../../src/middlewares/rate-limit.middleware.js';

describe('Unit — Limitador de tentativas de autenticação', () => {
  function buildApp(limit: number) {
    const app = express();
    app.post('/login', createAuthRateLimiter({ windowMs: 60_000, limit }), (_req, res) => {
      res.status(200).json({ ok: true });
    });
    return app;
  }

  it('bloqueia com 429 após exceder o número de tentativas permitido', async () => {
    const app = buildApp(2);

    expect((await request(app).post('/login')).status).toBe(200);
    expect((await request(app).post('/login')).status).toBe(200);

    const blocked = await request(app).post('/login');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toContain('Muitas tentativas');
  });

  it('informa o limite restante pelos cabeçalhos padronizados', async () => {
    const app = buildApp(5);
    const response = await request(app).post('/login');

    expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty('ratelimit');
  });
});
