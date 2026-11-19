import { Role } from '@prisma/client';
import { generateToken, verifyToken } from '../../src/utils/token.js';

describe('Unit — utilitário de tokens JWT', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  it('gera e verifica corretamente o payload do usuário no token JWT', () => {
    const payload = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'usuario@reservalab.com',
      role: Role.USER,
    };

    const token = generateToken(payload);
    const decoded = verifyToken(token);

    expect(token.split('.')).toHaveLength(3);
    expect(decoded).toMatchObject(payload);
  });

  it('lança erro ao verificar token adulterado ou malformado', () => {
    const token = generateToken({
      id: '22222222-2222-4222-8222-222222222222',
      email: 'admin@reservalab.com',
      role: Role.ADMIN,
    });

    expect(() => verifyToken(`${token}tampered`)).toThrow();
    expect(() => verifyToken('token.invalido')).toThrow();
  });

  it('lança erro explícito quando JWT_SECRET não está configurado', () => {
    delete process.env.JWT_SECRET;

    expect(() =>
      generateToken({
        id: '33333333-3333-4333-8333-333333333333',
        email: 'teste@reservalab.com',
        role: Role.USER,
      })
    ).toThrow('Variável de ambiente JWT_SECRET não configurada');

    expect(() => verifyToken('abc.def.ghi')).toThrow(
      'Variável de ambiente JWT_SECRET não configurada'
    );
  });
});
