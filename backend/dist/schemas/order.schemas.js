import { z } from 'zod';
// Validación para creación de pedido directo
export const createOrderSchema = z.object({
    clientId: z.string().uuid({ message: 'El clientId debe ser un UUID válido' }),
    description: z.string().min(5, { message: 'La descripción debe tener al menos 5 caracteres' }),
    totalPactado: z.number().positive({ message: 'El total pactado debe ser un monto positivo' }),
    estimatedDelivery: z.string().datetime({ message: 'Formato de fecha inválido (ISO-8601)' }).optional(),
});
// Validación para liquidación de metales y mermas en mesa
export const metalReturnSchema = z.object({
    materialId: z.string().uuid({ message: 'materialId debe ser un UUID válido' }),
    finalPieceWeight: z.number().positive({ message: 'El peso de la joya debe ser mayor a 0' }),
    scrapWeight: z.number().min(0, { message: 'La limalla no puede ser negativa' }),
    notes: z.string().max(255).optional(),
});
// Validación para abonos / pagos
export const addPaymentSchema = z.object({
    amount: z.number().positive({ message: 'El monto a abonar debe ser mayor a 0' }),
    paymentMethod: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA']),
    referenceNotes: z.string().max(150).optional(),
});
