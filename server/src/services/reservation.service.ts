import { Prisma, ReservationStatus } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware.js';
import { prisma } from './prisma.js';

const DEFAULT_MAX_RENT_DAYS = 14;
const DEFAULT_MAX_CONCURRENT_ITEMS = 3;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_TRANSACTION_ATTEMPTS = 3;

type CreateReservationInput = {
  userId: string;
  itemId: string;
  pickupDate: Date;
  returnDate: Date;
};

const reservationDetailsInclude = {
  item: {
    include: {
      category: true,
    },
  },
  loan: true,
} satisfies Prisma.ReservationInclude;

function isSerializationConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
  ) || (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2034'
  );
}

async function runSerializableTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  conflictMessage: string
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isSerializationConflict(error)) {
        throw error;
      }

      if (attempt === MAX_TRANSACTION_ATTEMPTS) {
        throw new AppError(conflictMessage, 409);
      }
    }
  }

  throw new AppError(conflictMessage, 409);
}

async function createInsideTransaction(
  transaction: Prisma.TransactionClient,
  input: CreateReservationInput
) {
  const settings = await transaction.systemSettings.findFirst({
    select: {
      max_rent_days: true,
      max_concurrent_items: true,
    },
  });
  const maxRentDays = settings?.max_rent_days ?? DEFAULT_MAX_RENT_DAYS;
  const maxConcurrentItems =
    settings?.max_concurrent_items ?? DEFAULT_MAX_CONCURRENT_ITEMS;
  const requestedDays =
    (input.returnDate.getTime() - input.pickupDate.getTime()) / MILLISECONDS_PER_DAY;

  if (requestedDays > maxRentDays) {
    throw new AppError(`O período máximo de reserva é de ${maxRentDays} dias`, 400);
  }

  const user = await transaction.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      is_manually_blocked: true,
    },
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  if (user.is_manually_blocked) {
    throw new AppError('Usuário bloqueado para novas reservas', 403);
  }

  const overdueLoan = await transaction.reservation.findFirst({
    where: {
      user_id: input.userId,
      status: ReservationStatus.ACTIVE_LOAN,
      expected_return_at: { lt: new Date() },
    },
    select: { id: true },
  });

  if (overdueLoan) {
    throw new AppError('Usuário possui empréstimo em atraso', 403);
  }

  const activeReservations = await transaction.reservation.count({
    where: {
      user_id: input.userId,
      status: {
        in: [ReservationStatus.SCHEDULED, ReservationStatus.ACTIVE_LOAN],
      },
    },
  });

  if (activeReservations >= maxConcurrentItems) {
    throw new AppError('Limite de reservas ativas atingido', 400);
  }

  const item = await transaction.item.findUnique({
    where: { id: input.itemId },
    select: { id: true, is_active: true },
  });

  if (!item) {
    throw new AppError('Equipamento não encontrado', 404);
  }

  if (!item.is_active) {
    throw new AppError('Equipamento inativo e indisponível para reserva', 409);
  }

  const overlappingReservation = await transaction.reservation.findFirst({
    where: {
      item_id: input.itemId,
      status: {
        in: [ReservationStatus.SCHEDULED, ReservationStatus.ACTIVE_LOAN],
      },
      expected_pickup_at: { lt: input.returnDate },
      expected_return_at: { gt: input.pickupDate },
    },
    select: { id: true },
  });

  if (overlappingReservation) {
    throw new AppError('Equipamento já reservado no período informado', 409);
  }

  const overlappingMaintenance = await transaction.maintenanceRecord.findFirst({
    where: {
      item_id: input.itemId,
      start_date: { lt: input.returnDate },
      OR: [
        { end_date: null },
        { end_date: { gt: input.pickupDate } },
      ],
    },
    select: { id: true },
  });

  if (overlappingMaintenance) {
    throw new AppError('Equipamento em manutenção no período informado', 409);
  }

  return transaction.reservation.create({
    data: {
      user_id: input.userId,
      item_id: input.itemId,
      expected_pickup_at: input.pickupDate,
      expected_return_at: input.returnDate,
      status: ReservationStatus.SCHEDULED,
    },
  });
}

export async function createReservation(input: CreateReservationInput) {
  return runSerializableTransaction(
    (transaction) => createInsideTransaction(transaction, input),
    'Não foi possível confirmar a disponibilidade. Tente novamente'
  );
}

export async function listUserReservations(userId: string) {
  return prisma.reservation.findMany({
    where: { user_id: userId },
    include: reservationDetailsInclude,
    orderBy: { created_at: 'desc' },
  });
}

export async function cancelUserReservation(userId: string, reservationId: string) {
  return runSerializableTransaction(async (transaction) => {
    const reservation = await transaction.reservation.findFirst({
      where: {
        id: reservationId,
        user_id: userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!reservation) {
      throw new AppError('Reserva não encontrada', 404);
    }

    if (reservation.status !== ReservationStatus.SCHEDULED) {
      throw new AppError('Apenas reservas agendadas podem ser canceladas', 400);
    }

    const updateResult = await transaction.reservation.updateMany({
      where: {
        id: reservationId,
        user_id: userId,
        status: ReservationStatus.SCHEDULED,
      },
      data: { status: ReservationStatus.CANCELLED },
    });

    if (updateResult.count !== 1) {
      throw new AppError('A reserva não está mais disponível para cancelamento', 400);
    }

    const cancelledReservation = await transaction.reservation.findUnique({
      where: { id: reservationId },
      include: reservationDetailsInclude,
    });

    if (!cancelledReservation) {
      throw new AppError('Reserva não encontrada', 404);
    }

    return cancelledReservation;
  }, 'Não foi possível concluir o cancelamento. Tente novamente');
}
