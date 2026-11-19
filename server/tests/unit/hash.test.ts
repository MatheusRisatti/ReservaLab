import { comparePassword, hashPassword } from '../../src/utils/hash.js';

describe('Unit — utilitário de hash de senhas (bcrypt)', () => {
  it('gera um hash diferente da senha em texto puro', async () => {
    const plain = 'SenhaForte@2026';
    const hash = await hashPassword(plain);

    expect(hash).toEqual(expect.any(String));
    expect(hash).not.toBe(plain);
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('valida corretamente senha correspondente e rejeita senha incorreta', async () => {
    const plain = 'ReservaLab123';
    const hash = await hashPassword(plain);

    await expect(comparePassword(plain, hash)).resolves.toBe(true);
    await expect(comparePassword('OutraSenhaErrada', hash)).resolves.toBe(false);
  });

  it('gera hashes distintos para a mesma senha devido ao salt aleatório', async () => {
    const plain = 'MesmaSenha123';
    const hashA = await hashPassword(plain);
    const hashB = await hashPassword(plain);

    expect(hashA).not.toBe(hashB);
    await expect(comparePassword(plain, hashA)).resolves.toBe(true);
    await expect(comparePassword(plain, hashB)).resolves.toBe(true);
  });
});
