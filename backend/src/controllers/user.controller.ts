import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as userService from '../services/user.service.js';
import { Role } from '@prisma/client';

export const handleGetUsers = async (req: AuthenticatedRequest, res: Response) => {
  const roleQuery = req.query.role as string | undefined;

  // Validar si el filtro de rol coincide con los valores permitidos
  if (roleQuery && !Object.values(Role).includes(roleQuery as Role)) {
    return res.status(400).json({ error: `Rol inválido. Roles válidos: ${Object.values(Role).join(', ')}` });
  }

  const users = await userService.getUsers(roleQuery as Role | undefined);
  res.json(users);
};

export const handleGetUserById = async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
};

export const handleUpdateUser = async (req: AuthenticatedRequest, res: Response) => {
  const { fullName, role } = req.body;
  const { id } = req.params;

  if (role && !Object.values(Role).includes(role)) {
    return res.status(400).json({ error: 'Rol no admitido' });
  }

  const updatedUser = await userService.updateUser(id, { fullName, role });
  res.json({
    message: 'Usuario actualizado exitosamente',
    user: updatedUser,
  });
};
