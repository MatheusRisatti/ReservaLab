import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';

function getJwtSecret(): Secret {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('Variável de ambiente JWT_SECRET não configurada');
  }
  return secret;
}

export interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
}

export function generateToken(payload: UserTokenPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, getJwtSecret(), options);
}

export function verifyToken(token: string): UserTokenPayload {
  return jwt.verify(token, getJwtSecret()) as UserTokenPayload;
}
