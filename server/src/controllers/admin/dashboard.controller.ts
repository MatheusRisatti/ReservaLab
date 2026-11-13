import { Request, Response } from 'express';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.js';

export async function getDailyPickups(_req: Request, res: Response): Promise<void> {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const pickups = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.SCHEDULED,
      expected_pickup_at: {
        lte: endOfToday,
      },
    },
    orderBy: { expected_pickup_at: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_manually_blocked: true,
        },
      },
      item: {
        include: {
          category: true,
        },
      },
    },
  });

  res.status(200).json({ pickups });
}

export async function getDailyReturns(_req: Request, res: Response): Promise<void> {
  const returns = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.ACTIVE_LOAN,
    },
    orderBy: { expected_return_at: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_manually_blocked: true,
        },
      },
      item: {
        include: {
          category: true,
        },
      },
      loan: true,
    },
  });

  res.status(200).json({ returns });
}
