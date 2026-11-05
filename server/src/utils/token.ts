import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'fallback_secret_key';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface UserTokenPayload {
  id: string;
  email: string;
  role: Role;
}

export function generateToken(payload: UserTokenPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): UserTokenPayload {
  return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
}
