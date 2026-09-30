import { Request, Response } from 'express';
import * as clientService from '../services/client.service';

export const handleGetClients = async (_req: Request, res: Response) => {
  try {
    const clients = await clientService.getClients();
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

export const handleCreateClient = async (req: Request, res: Response) => {
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
      return res.status(400).json({ error: 'El documento ya está registrado' });
    }
    res.status(500).json({ error: 'Error al registrar cliente' });
  }
};

export const handleUpdateClient = async (req: Request, res: Response) => {
  try {
    const { id, fullName, phone, email, documentId } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Nombre y teléfono son obligatorios' });
    }
    const updatedClient = await clientService.updateClient(id, {
      fullName,
      phone,
      email,
      documentId,
    });
    res.status(200).json(updatedClient);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El documento ya está registrado' });
    }
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

export const handleDeleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const deletedClient = await clientService.deleteClient(id);
    res.status(200).json(deletedClient);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};
