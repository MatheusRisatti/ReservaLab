import { Request, Response } from 'express';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.js';

export async function createMaintenance(req: Request, res: Response): Promise<void> {
  const { id: item_id } = req.params;
  const { description, start_date, end_date } = req.body;

  const item = await prisma.item.findUnique({
    where: { id: item_id },
  });

  if (!item) {
    res.status(404).json({ error: 'Equipamento não encontrado' });
    return;
  }

  // Verificar se o equipamento está em empréstimo ativo no momento
  const activeLoanReservation = await prisma.reservation.findFirst({
    where: {
      item_id,
      status: ReservationStatus.ACTIVE_LOAN,
    },
  });

  if (activeLoanReservation) {
    res.status(400).json({
      error: 'Não é possível enviar para manutenção um equipamento com empréstimo ativo em andamento',
    });
    return;
  }

  const maintenance = await prisma.maintenanceRecord.create({
    data: {
      item_id,
      description,
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : null,
    },
    include: {
      item: true,
    },
  });

  res.status(201).json({ maintenance });
}

export async function concludeMaintenance(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const maintenance = await prisma.maintenanceRecord.findUnique({
    where: { id },
  });

  if (!maintenance) {
    res.status(404).json({ error: 'Registro de manutenção não encontrado' });
    return;
  }

  if (maintenance.end_date) {
    res.status(400).json({ error: 'Esta manutenção já foi finalizada anteriormente' });
    return;
  }

  const updatedMaintenance = await prisma.maintenanceRecord.update({
    where: { id },
    data: {
      end_date: new Date(),
    },
    include: {
      item: true,
    },
  });

  res.status(200).json({ maintenance: updatedMaintenance });
}
