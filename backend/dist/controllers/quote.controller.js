import * as quoteService from '../services/quote.service.js';
export const handleCreateQuote = async (req, res) => {
    try {
        const { clientId, validUntil, items } = req.body;
        if (!clientId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'El cliente y al menos un ítem son obligatorios' });
        }
        const quote = await quoteService.createQuote({
            clientId,
            createdById: req.user.id,
            validUntil: validUntil ? new Date(validUntil) : undefined,
            items,
        });
        res.status(201).json(quote);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Error al crear la cotización' });
    }
};
export const handleGetQuotes = async (_req, res) => {
    try {
        const quotes = await quoteService.getQuotes();
        res.json(quotes);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al consultar cotizaciones' });
    }
};
export const handleGetQuoteById = async (req, res) => {
    try {
        const quote = await quoteService.getQuoteById(req.params.id);
        if (!quote)
            return res.status(404).json({ error: 'Cotización no encontrada' });
        res.json(quote);
    }
    catch (error) {
        res.status(500).json({ error: 'Error al consultar la cotización' });
    }
};
export const handleApproveQuote = async (req, res) => {
    try {
        const order = await quoteService.approveQuoteAndConvertToOrder(req.params.id, req.user.id);
        res.status(200).json({
            message: 'Cotización aprobada y pedido generado exitosamente',
            order,
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const handleUpdateQuote = async (req, res) => {
    try {
        const { clientId, validUntil, items } = req.body;
        const quote = await quoteService.updateQuote(req.params.id, {
            clientId,
            validUntil: validUntil ? new Date(validUntil) : undefined,
            items,
        });
        res.json(quote);
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Error al actualizar cotización' });
    }
};
export const handleDeleteQuote = async (req, res) => {
    try {
        await quoteService.deleteQuote(req.params.id);
        res.json({ message: 'Cotización borrador eliminada exitosamente' });
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Error al eliminar cotización' });
    }
};
