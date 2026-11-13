import { Request, Response } from 'express';
import { prisma } from '../../services/prisma.js';

export async function listAdminItems(_req: Request, res: Response): Promise<void> {
  const items = await prisma.item.findMany({
    orderBy: { name: 'asc' },
    include: {
      category: true,
      maintenance: {
        where: { end_date: null },
      },
    },
  });

  res.status(200).json({ items });
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const { name, patrimony_code, category_id } = req.body;

  const categoryExists = await prisma.category.findUnique({
    where: { id: category_id },
  });

  if (!categoryExists) {
    res.status(404).json({ error: 'Categoria informada não encontrada' });
    return;
  }

  const existingPatrimony = await prisma.item.findUnique({
    where: { patrimony_code },
  });

  if (existingPatrimony) {
    res.status(409).json({ error: 'Já existe um equipamento cadastrado com este código de patrimônio' });
    return;
  }

  const item = await prisma.item.create({
    data: {
      name,
      patrimony_code,
      category_id,
      is_active: true,
    },
    include: {
      category: true,
    },
  });

  res.status(201).json({ item });
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, category_id, is_active } = req.body;

  const item = await prisma.item.findUnique({
    where: { id },
  });

  if (!item) {
    res.status(404).json({ error: 'Equipamento não encontrado' });
    return;
  }

  if (category_id && category_id !== item.category_id) {
    const categoryExists = await prisma.category.findUnique({
      where: { id: category_id },
    });
    if (!categoryExists) {
      res.status(404).json({ error: 'Categoria informada não encontrada' });
      return;
    }
  }

  const updatedItem = await prisma.item.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(category_id !== undefined && { category_id }),
      ...(is_active !== undefined && { is_active }),
    },
    include: {
      category: true,
    },
  });

  res.status(200).json({ item: updatedItem });
}

export async function toggleItemStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { is_active } = req.body;

  const item = await prisma.item.findUnique({
    where: { id },
  });

  if (!item) {
    res.status(404).json({ error: 'Equipamento não encontrado' });
    return;
  }

  const updatedItem = await prisma.item.update({
    where: { id },
    data: { is_active },
    include: {
      category: true,
    },
  });

  res.status(200).json({ item: updatedItem });
}
