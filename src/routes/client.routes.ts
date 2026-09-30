import { Router } from 'express';
import { handleGetClients, handleCreateClient, handleUpdateClient, handleDeleteClient } from '../controllers/client.controller';

const router = Router();

router.get('/', handleGetClients);
router.post('/', handleCreateClient);
router.put('/:id', handleUpdateClient);
router.delete('/:id', handleDeleteClient);

export default router;