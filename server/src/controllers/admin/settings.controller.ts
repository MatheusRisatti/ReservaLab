import { Request, Response } from 'express';
import { prisma } from '../../services/prisma.js';

export async function getSettings(_req: Request, res: Response): Promise<void> {
  let settings = await prisma.systemSettings.findFirst();

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        max_rent_days: 14,
        max_concurrent_items: 3,
      },
    });
  }

  res.status(200).json({ settings });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const { max_rent_days, max_concurrent_items } = req.body;

  let settings = await prisma.systemSettings.findFirst();

  if (!settings) {
    settings = await prisma.systemSettings.create({
      data: {
        max_rent_days,
        max_concurrent_items,
      },
    });
  } else {
    settings = await prisma.systemSettings.update({
      where: { id: settings.id },
      data: {
        max_rent_days,
        max_concurrent_items,
      },
    });
  }

  res.status(200).json({ settings });
}
