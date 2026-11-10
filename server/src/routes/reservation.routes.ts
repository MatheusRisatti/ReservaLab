import { Router } from 'express';
import {
  cancelReservation,
  createReservation,
  getMyReservations,
} from '../controllers/reservation.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  cancelReservationSchema,
  createReservationSchema,
} from '../schemas/reservation.schema.js';

export const reservationRouter = Router();

reservationRouter.get('/my-reservations', authMiddleware, getMyReservations);

reservationRouter.post(
  '/',
  authMiddleware,
  validate(createReservationSchema),
  createReservation
);

reservationRouter.patch(
  '/:id/cancel',
  authMiddleware,
  validate(cancelReservationSchema),
  cancelReservation
);
