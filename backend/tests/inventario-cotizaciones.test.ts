import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { enviarCorreo, prismaMock as db, token } from './ayudas.js';

describe('Consumo de material y alerta de stock (Brevo simulado)', () => {
  const consumir = () =>
    request(app)
      .post('/api/orders/p-1/materials')
      .set('Authorization', token('JOYERO'))
      .send({ materialId: 'm-1', quantity: 4 });
  const preparar = (stockFinal: number, stockInicial = 10) => {
    const base = { id: 'm-1', name: 'Plata', unit: 'GRAMOS', minStock: 6 };
    db.material.findUnique.mockResolvedValue({ ...base, stock: stockInicial });
    db.orderMaterial.create.mockResolvedValue({ id: 'om-1' });
    db.material.update.mockResolvedValue({ ...base, stock: stockFinal });
  };

  it('P18 descuenta stock, audita y envía la alerta al llegar al mínimo', async () => {
    preparar(6);
    const r = await consumir();
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ remainingStock: 6, isLowStock: true });
    expect(db.material.update.mock.calls[0][0].data.stock).toEqual({ decrement: 4 });
    expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(enviarCorreo).toHaveBeenCalledTimes(1));
    const correo = enviarCorreo.mock.calls[0][0];
    expect(correo).toMatchObject({
      to: [{ email: 'admin@example.com' }],
      sender: { email: 'taller@example.com' },
    });
    expect(correo.subject).toContain('Plata');
    expect(correo.htmlContent).toContain('6 GRAMOS');
  });

  it('P19 no envía alerta si el stock queda sobre el mínimo', async () => {
    preparar(7);
    expect((await consumir()).body.isLowStock).toBe(false);
    expect(enviarCorreo).not.toHaveBeenCalled();
  });

  it('P20 un fallo de Brevo no afecta el consumo', async () => {
    preparar(5);
    enviarCorreo.mockRejectedValue(new Error('Brevo caído'));
    expect((await consumir()).status).toBe(200);
  });

  it('P21 omite el correo si falta configuración', async () => {
    vi.stubEnv('BREVO_API_KEY', '');
    preparar(5);
    expect((await consumir()).status).toBe(200);
    expect(enviarCorreo).not.toHaveBeenCalled();
  });

  it('P22 rechaza un consumo mayor al stock', async () => {
    preparar(0, 3);
    const r = await consumir();
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('Stock insuficiente de Plata');
    expect(db.orderMaterial.create).not.toHaveBeenCalled();
  });
});

describe('Cotizaciones', () => {
  const items = [
    { description: 'Anillo', quantity: 2, unitPrice: 150 },
    { description: 'Dije', quantity: 1, unitPrice: 80 },
  ];
  const creados = [
    { description: 'Anillo', quantity: 2, unitPrice: 150, subtotal: 300 },
    { description: 'Dije', quantity: 1, unitPrice: 80, subtotal: 80 },
  ];
  const editar = () =>
    request(app).put('/api/quotes/q-1').set('Authorization', token()).send({ items });

  it('P23 crea la cotización con subtotales y total', async () => {
    db.quote.create.mockResolvedValue({ id: 'q-1' });
    const r = await request(app)
      .post('/api/quotes')
      .set('Authorization', token())
      .send({ clientId: 'c-1', items });
    expect(r.status).toBe(201);
    const { data } = db.quote.create.mock.calls[0][0];
    expect(data.totalAmount).toBe(380);
    expect(data.items.create).toEqual(creados);
  });

  it('P24 al editar reemplaza los ítems y recalcula el total', async () => {
    db.quote.findUnique.mockResolvedValue({ id: 'q-1', clientId: 'c-1', status: 'BORRADOR', items: [] });
    db.quote.update.mockResolvedValue({ id: 'q-1' });
    expect((await editar()).status).toBe(200);
    expect(db.quoteItem.deleteMany).toHaveBeenCalledWith({ where: { quoteId: 'q-1' } });
    const { data } = db.quote.update.mock.calls[0][0];
    expect(data.totalAmount).toBe(380);
    expect(data.items.create).toEqual(creados);
  });

  it('P25 no permite modificar una cotización aprobada', async () => {
    db.quote.findUnique.mockResolvedValue({ id: 'q-1', status: 'APROBADA', items: [] });
    const r = await editar();
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('No se puede modificar una cotización ya aprobada');
  });

  it('P26 exige cliente y al menos un ítem', async () => {
    const r = await request(app)
      .post('/api/quotes')
      .set('Authorization', token())
      .send({ clientId: 'c-1', items: [] });
    expect(r.status).toBe(400);
  });
});
