import { NextFunction, Request, Response } from 'express';
import { ReservationStatus } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware.js';
import { prisma } from '../services/prisma.js';

type CatalogPeriod = {
  pickupDate: Date;
  returnDate: Date;
};

function parsePeriod(req: Request): CatalogPeriod | null {
  const pickupDateValue = req.query.pickup_date;
  const returnDateValue = req.query.return_date;
  const hasPickupDate = typeof pickupDateValue === 'string';
  const hasReturnDate = typeof returnDateValue === 'string';

  if (hasPickupDate !== hasReturnDate) {
    throw new AppError('Informe pickup_date e return_date juntos', 400);
  }

  if (!hasPickupDate || !hasReturnDate) {
    return null;
  }

  const pickupDate = new Date(pickupDateValue);
  const returnDate = new Date(returnDateValue);

  if (
    Number.isNaN(pickupDate.getTime()) ||
    Number.isNaN(returnDate.getTime()) ||
    returnDate <= pickupDate
  ) {
    throw new AppError('Período de retirada e devolução inválido', 400);
  }

  return { pickupDate, returnDate };
}

export async function listCategories(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
}

export async function getPublicSettings(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await prisma.systemSettings.findFirst({
      select: {
        max_rent_days: true,
        max_concurrent_items: true,
      },
    });

    res.status(200).json({
      settings: {
        max_rent_days: settings?.max_rent_days ?? 14,
        max_concurrent_items: settings?.max_concurrent_items ?? 3,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listItems(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const period = parsePeriod(req);
    const categoryId = typeof req.query.category_id === 'string'
      ? req.query.category_id
      : undefined;

    const reservationWhere = period
      ? {
          status: {
            in: [ReservationStatus.SCHEDULED, ReservationStatus.ACTIVE_LOAN],
          },
          expected_pickup_at: { lt: period.returnDate },
          expected_return_at: { gt: period.pickupDate },
        }
      : { status: ReservationStatus.ACTIVE_LOAN };

    const maintenanceWhere = period
      ? {
          start_date: { lt: period.returnDate },
          OR: [
            { end_date: null },
            { end_date: { gt: period.pickupDate } },
          ],
        }
      : { end_date: null };

    const catalogItems = await prisma.item.findMany({
      where: {
        is_active: true,
        ...(categoryId ? { category_id: categoryId } : {}),
      },
      include: {
        category: true,
        reservations: {
          where: reservationWhere,
          select: { id: true },
          take: 1,
        },
        maintenance: {
          where: maintenanceWhere,
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const items = await Promise.all(
      catalogItems.map(async ({ reservations, maintenance, ...item }) => {
        const totalQuantity = item.quantity ?? 1;

        if (totalQuantity <= 1) {
          const isAvailable = reservations.length === 0 && maintenance.length === 0;
          return {
            ...item,
            ...(item.quantity !== undefined
              ? { available_quantity: isAvailable ? 1 : 0 }
              : {}),
            is_available: isAvailable,
          };
        }

        // Quando o equipamento possui mais de 1 unidade cadastrada, verifica quantas estão reservadas no período
        let reservedCount = 0;
        if (reservations.length > 0 && maintenance.length === 0) {
          reservedCount = await prisma.reservation.count({
            where: {
              item_id: item.id,
              ...reservationWhere,
            },
          });
        }

        const availableQuantity =
          maintenance.length > 0 ? 0 : Math.max(0, totalQuantity - reservedCount);

        return {
          ...item,
          available_quantity: availableQuantity,
          is_available: availableQuantity > 0,
        };
      })
    );

    res.status(200).json({ items });
  } catch (error) {
    next(error);
  }
}
