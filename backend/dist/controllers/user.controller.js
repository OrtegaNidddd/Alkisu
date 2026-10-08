import * as userService from '../services/user.service.js';
import { Role } from '@prisma/client';
export const handleGetUsers = async (req, res) => {
    try {
        const roleQuery = req.query.role;
        // Validar si el filtro de rol coincide con los valores permitidos
        if (roleQuery && !Object.values(Role).includes(roleQuery)) {
            return res.status(400).json({ error: `Rol inválido. Roles válidos: ${Object.values(Role).join(', ')}` });
        }
        const users = await userService.getUsers(roleQuery);
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al consultar la lista de usuarios' });
    }
};
export const handleGetUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user)
            return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al consultar usuario' });
    }
};
export const handleUpdateUser = async (req, res) => {
    try {
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
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Error al actualizar usuario' });
    }
};
