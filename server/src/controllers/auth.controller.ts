import { NextFunction, Request, Response } from 'express';
import { Prisma, ReservationStatus, Role } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware.js';
import { prisma } from '../services/prisma.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { generateToken } from '../utils/token.js';

type UserStatus = 'BLOCKED' | 'LIMIT_REACHED' | 'AVAILABLE';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function handleRegistrationError(error: unknown, next: NextFunction): void {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    next(new AppError('Este e-mail já está cadastrado', 409));
    return;
  }

  next(error);
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const name = String(req.body.name).trim();
    const email = normalizeEmail(String(req.body.email));
    const password = String(req.body.password);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new AppError('Este e-mail já está cadastrado', 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        role: Role.USER,
        is_manually_blocked: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_manually_blocked: true,
        created_at: true,
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    handleRegistrationError(error, next);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const email = normalizeEmail(String(req.body.email));
    const password = String(req.body.password);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await comparePassword(password, user.password_hash))) {
      throw new AppError('E-mail ou senha inválidos', 401);
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { password_hash: _passwordHash, ...publicUser } = user;
    res.status(200).json({ token, user: publicUser });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_manually_blocked: true,
        created_at: true,
      },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado', 404);
    }

    let status: UserStatus = 'AVAILABLE';

    if (user.is_manually_blocked) {
      status = 'BLOCKED';
    } else {
      const overdueLoan = await prisma.reservation.findFirst({
        where: {
          user_id: user.id,
          status: ReservationStatus.ACTIVE_LOAN,
          expected_return_at: { lt: new Date() },
        },
        select: { id: true },
      });

      if (overdueLoan) {
        status = 'BLOCKED';
      } else {
        const [settings, activeReservations] = await Promise.all([
          prisma.systemSettings.findFirst({
            select: { max_concurrent_items: true },
          }),
          prisma.reservation.count({
            where: {
              user_id: user.id,
              status: {
                in: [ReservationStatus.SCHEDULED, ReservationStatus.ACTIVE_LOAN],
              },
            },
          }),
        ]);

        const maxConcurrentItems = settings?.max_concurrent_items ?? 3;
        if (activeReservations >= maxConcurrentItems) {
          status = 'LIMIT_REACHED';
        }
      }
    }

    res.status(200).json({ user, status });
  } catch (error) {
    next(error);
  }
}
