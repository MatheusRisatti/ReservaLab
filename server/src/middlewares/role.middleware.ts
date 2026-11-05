import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export function roleMiddleware(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado: permissões insuficientes' });
      return;
    }

    next();
  };
}
