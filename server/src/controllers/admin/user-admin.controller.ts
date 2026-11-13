import { Request, Response } from 'express';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.js';

export async function listAdminUsers(_req: Request, res: Response): Promise<void> {
  const [users, settings] = await Promise.all([
    prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_manually_blocked: true,
        created_at: true,
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.SCHEDULED, ReservationStatus.ACTIVE_LOAN],
            },
          },
          select: {
            id: true,
            status: true,
            expected_return_at: true,
          },
        },
      },
    }),
    prisma.systemSettings.findFirst(),
  ]);

  const maxConcurrent = settings?.max_concurrent_items ?? 3;
  const now = new Date();

  const formattedUsers = users.map((u) => {
    const activeLoans = u.reservations.filter((r) => r.status === ReservationStatus.ACTIVE_LOAN);
    const hasOverdueLoan = activeLoans.some((r) => new Date(r.expected_return_at) < now);
    const activeCount = u.reservations.length;

    let dynamicStatus: 'LIBERADO' | 'BLOQUEADO' | 'LIMITE_ATINGIDO' = 'LIBERADO';
    let statusReason = 'Apto para realizar reservas';

    if (u.is_manually_blocked) {
      dynamicStatus = 'BLOQUEADO';
      statusReason = 'Usuário bloqueado manualmente pela administração';
    } else if (hasOverdueLoan) {
      dynamicStatus = 'BLOQUEADO';
      statusReason = 'Possui empréstimo com devolução em atraso';
    } else if (activeCount >= maxConcurrent) {
      dynamicStatus = 'LIMITE_ATINGIDO';
      statusReason = `Atingiu o limite de ${maxConcurrent} itens simultâneos`;
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      is_manually_blocked: u.is_manually_blocked,
      created_at: u.created_at,
      active_reservations_count: activeCount,
      dynamic_status: dynamicStatus,
      status_reason: statusReason,
    };
  });

  res.status(200).json({ users: formattedUsers });
}

export async function toggleUserBlock(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (req.user?.id === id) {
    res.status(400).json({ error: 'Você não pode alterar o bloqueio do seu próprio usuário' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      is_manually_blocked: !user.is_manually_blocked,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      is_manually_blocked: true,
    },
  });

  res.status(200).json({ user: updatedUser });
}
