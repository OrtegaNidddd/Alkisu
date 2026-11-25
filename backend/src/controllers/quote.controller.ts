import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as quoteService from '../services/quote.service.js';

export const handleCreateQuote = async (req: AuthenticatedRequest, res: Response) => {
  const { clientId, validUntil, items } = req.body;

  if (!clientId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El cliente y al menos un ítem son obligatorios' });
  }

  const quote = await quoteService.createQuote({
    clientId,
    createdById: req.user!.id,
    validUntil: validUntil ? new Date(validUntil) : undefined,
    items,
  });

  res.status(201).json(quote);
};

export const handleGetQuotes = async (_req: AuthenticatedRequest, res: Response) => {
  const quotes = await quoteService.getQuotes();
  res.json(quotes);
};

export const handleGetQuoteById = async (req: AuthenticatedRequest, res: Response) => {
  const quote = await quoteService.getQuoteById(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json(quote);
};

export const handleApproveQuote = async (req: AuthenticatedRequest, res: Response) => {
  const order = await quoteService.approveQuoteAndConvertToOrder(
    req.params.id,
    req.user!.id
  );
  res.status(200).json({
    message: 'Cotización aprobada y pedido generado exitosamente',
    order,
  });
};
export const handleUpdateQuote = async (req: AuthenticatedRequest, res: Response) => {
  const { clientId, validUntil, items } = req.body;
  const quote = await quoteService.updateQuote(req.params.id, {
    clientId,
    validUntil: validUntil ? new Date(validUntil) : undefined,
    items,
  });
  res.json(quote);
};

export const handleDeleteQuote = async (req: AuthenticatedRequest, res: Response) => {
  await quoteService.deleteQuote(req.params.id);
  res.json({ message: 'Cotización borrador eliminada exitosamente' });
};
