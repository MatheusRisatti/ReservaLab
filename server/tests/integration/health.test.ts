import request from 'supertest';
import { app } from '../../src/app.js';

describe('GET /health', () => {
  it('deve retornar status 200 e confirmar que a API está online', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'ReservaLab API');
    expect(response.body).toHaveProperty('timestamp');
  });
});
