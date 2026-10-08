import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as clientService from '../services/client.service.js';

export const handleGetClients = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const clients = await clientService.getClients(search);
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar clientes' });
  }
};

export const handleGetClientById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const client = await clientService.getClientById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar ficha del cliente' });
  }
};

export const handleCreateClient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phone, email, documentId } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
    }

    const newClient = await clientService.createClient({
      fullName,
      phone,
      email,
      documentId,
    });
    res.status(201).json(newClient);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El documento o correo ya está registrado' });
    }
    res.status(500).json({ error: 'Error al registrar cliente' });
  }
};

export const handleUpdateClient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fullName, phone, email, documentId } = req.body;
    const updated = await clientService.updateClient(req.params.id, {
      fullName,
      phone,
      email,
      documentId,
    });

    res.json({
      message: 'Datos del cliente actualizados',
      client: updated,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El documento o correo ya pertenece a otro cliente' });
    }
    res.status(400).json({ error: error.message || 'Error al actualizar cliente' });
  }
};