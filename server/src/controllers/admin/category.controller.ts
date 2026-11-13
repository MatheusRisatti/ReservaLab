import { Request, Response } from 'express';
import { prisma } from '../../services/prisma.js';

export async function listAdminCategories(_req: Request, res: Response): Promise<void> {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  res.status(200).json({ categories });
}

export async function createCategory(req: Request, res: Response): Promise<void> {
  const { name, description } = req.body;

  const existingCategory = await prisma.category.findUnique({
    where: { name },
  });

  if (existingCategory) {
    res.status(409).json({ error: 'Já existe uma categoria cadastrada com este nome' });
    return;
  }

  const category = await prisma.category.create({
    data: {
      name,
      description: description ?? null,
    },
  });

  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, description } = req.body;

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    res.status(404).json({ error: 'Categoria não encontrada' });
    return;
  }

  if (name && name !== category.name) {
    const existingName = await prisma.category.findUnique({
      where: { name },
    });
    if (existingName) {
      res.status(409).json({ error: 'Já existe uma categoria cadastrada com este nome' });
      return;
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  });

  res.status(200).json({ category: updatedCategory });
}

export async function deleteCategory(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    res.status(404).json({ error: 'Categoria não encontrada' });
    return;
  }

  const itemsCount = await prisma.item.count({
    where: { category_id: id },
  });

  if (itemsCount > 0) {
    res.status(400).json({
      error: 'Não é possível remover categoria que possui equipamentos vinculados',
    });
    return;
  }

  await prisma.category.delete({
    where: { id },
  });

  res.status(200).json({ message: 'Categoria removida com sucesso' });
}
