import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middlewares/error.middleware.js';
import {
  cancelUserReservation,
  createReservation as createReservationService,
  listUserReservations,
} from '../services/reservation.service.js';

export async function createReservation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    const reservation = await createReservationService({
      userId: req.user.id,
      itemId: req.body.item_id,
      pickupDate: new Date(req.body.expected_pickup_at),
      returnDate: new Date(req.body.expected_return_at),
    });

    res.status(201).json({ reservation });
  } catch (error) {
    next(error);
  }
}

export async function getMyReservations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    const reservations = await listUserReservations(req.user.id);
    res.status(200).json({ reservations });
  } catch (error) {
    next(error);
  }
}

export async function cancelReservation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    const reservation = await cancelUserReservation(req.user.id, req.params.id);
    res.status(200).json({ reservation });
  } catch (error) {
    next(error);
  }
}
