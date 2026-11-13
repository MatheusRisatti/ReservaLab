import { Request, Response } from 'express';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.js';

export async function pickupLoan(req: Request, res: Response): Promise<void> {
  const { reservation_id } = req.body;

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservation_id },
    include: { loan: true },
  });

  if (!reservation) {
    res.status(404).json({ error: 'Reserva não encontrada' });
    return;
  }

  if (reservation.status !== ReservationStatus.SCHEDULED) {
    res.status(400).json({ error: 'Apenas reservas agendadas podem ter a retirada confirmada' });
    return;
  }

  if (reservation.loan) {
    res.status(400).json({ error: 'Esta reserva já possui um empréstimo associado' });
    return;
  }

  const [loan, updatedReservation] = await prisma.$transaction([
    prisma.loan.create({
      data: {
        reservation_id,
        actual_pickup_at: new Date(),
      },
    }),
    prisma.reservation.update({
      where: { id: reservation_id },
      data: { status: ReservationStatus.ACTIVE_LOAN },
      include: {
        item: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  res.status(201).json({
    loan,
    reservation: updatedReservation,
  });
}

export async function markNoShow(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    res.status(404).json({ error: 'Reserva não encontrada' });
    return;
  }

  if (reservation.status !== ReservationStatus.SCHEDULED) {
    res.status(400).json({ error: 'Apenas reservas agendadas podem ser marcadas como não comparecimento' });
    return;
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: { status: ReservationStatus.NO_SHOW },
    include: {
      item: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  res.status(200).json({ reservation: updatedReservation });
}

export async function returnLoan(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { return_observation } = req.body;

  // Busca empréstimo por ID do Loan ou pelo reservation_id
  const loan = await prisma.loan.findFirst({
    where: {
      OR: [{ id }, { reservation_id: id }],
    },
    include: {
      reservation: true,
    },
  });

  if (!loan) {
    res.status(404).json({ error: 'Registro de empréstimo não encontrado' });
    return;
  }

  if (loan.actual_return_at) {
    res.status(400).json({ error: 'Este empréstimo já foi finalizado anteriormente' });
    return;
  }

  const [updatedLoan, updatedReservation] = await prisma.$transaction([
    prisma.loan.update({
      where: { id: loan.id },
      data: {
        actual_return_at: new Date(),
        return_observation: return_observation ?? null,
      },
    }),
    prisma.reservation.update({
      where: { id: loan.reservation_id },
      data: { status: ReservationStatus.COMPLETED },
      include: {
        item: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  res.status(200).json({
    loan: updatedLoan,
    reservation: updatedReservation,
  });
}

export async function getLoansHistory(req: Request, res: Response): Promise<void> {
  const { status, patrimony_code, user_email } = req.query;

  const reservations = await prisma.reservation.findMany({
    where: {
      ...(status && { status: status as ReservationStatus }),
      ...(patrimony_code && {
        item: { patrimony_code: String(patrimony_code) },
      }),
      ...(user_email && {
        user: { email: { contains: String(user_email), mode: 'insensitive' } },
      }),
    },
    orderBy: { created_at: 'desc' },
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

  res.status(200).json({ history: reservations });
}
