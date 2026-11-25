import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as clientService from '../services/client.service.js';
import { siDuplicado } from '../lib/errors.js';

export const handleGetClients = async (req: AuthenticatedRequest, res: Response) => {
  const search = req.query.search as string | undefined;
  const clients = await clientService.getClients(search);
  res.json(clients);
};

export const handleGetClientById = async (req: AuthenticatedRequest, res: Response) => {
  const client = await clientService.getClientById(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(client);
};

export const handleCreateClient = async (req: AuthenticatedRequest, res: Response) => {
  const { fullName, phone, email, documentId } = req.body;
  if (!fullName || !phone) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
  }

  const newClient = await clientService.createClient({
    fullName,
    phone,
    email,
    documentId,
  }).catch(siDuplicado('El documento o correo ya está registrado'));
  res.status(201).json(newClient);
};

export const handleUpdateClient = async (req: AuthenticatedRequest, res: Response) => {
  const { fullName, phone, email, documentId } = req.body;
  const updated = await clientService.updateClient(req.params.id, {
    fullName,
    phone,
    email,
    documentId,
  }).catch(siDuplicado('El documento o correo ya pertenece a otro cliente'));

  res.json({
    message: 'Datos del cliente actualizados',
    client: updated,
  });
};
