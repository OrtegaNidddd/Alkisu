import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { pedido, prismaMock as db, token } from './ayudas.js';

const cambiarEstado = (status: unknown) =>
  request(app).patch('/api/orders/p-1/status').set('Authorization', token()).send({ status });

const abonar = (amount: unknown) =>
  request(app)
    .post('/api/orders/p-1/payments')
    .set('Authorization', token())
    .send({ amount, paymentMethod: 'EFECTIVO' });

describe('Saldo y abonos', () => {
  it('P01 registra un abono y devuelve el nuevo saldo', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ payments: [{ amount: 300 }] }));
    db.payment.create.mockResolvedValue({ id: 'a-1', amount: 200 });
    const r = await abonar(200);
    expect(r.status).toBe(201);
    expect(r.body.nuevoSaldo).toBe(500);
    expect(db.payment.create.mock.calls[0][0].data).toMatchObject({ orderId: 'p-1', amount: 200 });
  });

  it('P02 rechaza un abono mayor al saldo y no lo guarda', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ payments: [{ amount: 900 }] }));
    const r = await abonar(200);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('El abono ($200) excede el saldo pendiente ($100)');
    expect(db.payment.create).not.toHaveBeenCalled();
  });

  it('P03 valida que el monto del abono sea positivo', async () => {
    const r = await abonar(-5);
    expect(r.status).toBe(400);
    expect(r.body.details[0].field).toBe('amount');
  });

  it('P04 el detalle del pedido incluye el resumen financiero', async () => {
    const createdAt = new Date(0);
    db.order.findUnique.mockResolvedValue(
      pedido({
        payments: [{ amount: '400', createdAt }, { amount: '600', createdAt }],
        totalPactado: '1000',
        statusHistory: [],
        materialsUsed: [],
      })
    );
    const r = await request(app).get('/api/orders/p-1').set('Authorization', token());
    expect(r.body.financialSummary).toEqual({
      totalPactado: 1000, totalAbonado: 1000, saldoPendiente: 0, estaLiquidado: true,
    });
  });

  it('P05 la lista de pedidos calcula el saldo y la paginación', async () => {
    db.order.count.mockResolvedValue(1);
    db.order.findMany.mockResolvedValue([
      pedido({ payments: [{ amount: 250 }], materialsUsed: [], statusHistory: [], _count: { materialsUsed: 0 } }),
    ]);
    const r = await request(app).get('/api/orders?limit=10').set('Authorization', token());
    expect(r.body.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
    expect(r.body.data[0]).toMatchObject({ totalAbonado: 250, saldoPendiente: 750 });
  });
});

describe('Estados y entrega', () => {
  it('P06 bloquea la entrega con saldo pendiente', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ payments: [{ amount: 400 }] }));
    const r = await cambiarEstado('ENTREGADO');
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Entrega rechazada: el pedido tiene un saldo pendiente de $600');
    expect(db.order.update).not.toHaveBeenCalled();
  });

  it('P07 entrega un pedido pagado y deja historial', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ payments: [{ amount: 1000 }] }));
    const r = await cambiarEstado('ENTREGADO');
    expect(r.status).toBe(200);
    expect(db.order.update.mock.calls[0][0].data.deliveryDate).toBeInstanceOf(Date);
    expect(db.orderStatusHistory.create.mock.calls[0][0].data).toMatchObject({
      fromStatus: 'CALIDAD', toStatus: 'ENTREGADO',
    });
  });

  it('P08 exige joyero para pasar a FABRICACION', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ status: 'CREADO', artisanId: null }));
    const r = await cambiarEstado('FABRICACION');
    expect(r.status).toBe(400);
    expect(r.body.error).toContain('no tiene un joyero asignado');
  });

  it('P09 permite el flujo normal CREADO -> FABRICACION -> CALIDAD', async () => {
    db.order.findUnique.mockResolvedValueOnce(pedido({ status: 'CREADO' }));
    expect((await cambiarEstado('FABRICACION')).status).toBe(200);
    db.order.findUnique.mockResolvedValueOnce(pedido({ status: 'FABRICACION' }));
    expect((await cambiarEstado('CALIDAD')).status).toBe(200);
  });

  it('P10 [defecto] impide entregar un pedido que no pasó por CALIDAD', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ status: 'CREADO', payments: [{ amount: 1000 }] }));
    const r = await cambiarEstado('ENTREGADO');
    expect(r.status).toBe(400);
    expect(db.order.update).not.toHaveBeenCalled();
  });

  it('P11 [defecto] impide reabrir un pedido ya entregado', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ status: 'ENTREGADO', payments: [{ amount: 1000 }] }));
    expect((await cambiarEstado('FABRICACION')).status).toBe(400);
  });

  it('P12 [defecto] impide cancelar por la ruta de estados, que no exige motivo', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ status: 'CREADO' }));
    expect((await cambiarEstado('CANCELADO')).status).toBe(400);
  });

  it('P13 cancela con motivo y rechaza cancelar un pedido entregado', async () => {
    const cancelar = () =>
      request(app).patch('/api/orders/p-1/cancel').set('Authorization', token()).send({ reason: 'Desistió' });
    db.order.findUnique.mockResolvedValueOnce(pedido());
    expect((await cancelar()).status).toBe(200);
    db.order.findUnique.mockResolvedValueOnce(pedido({ status: 'ENTREGADO' }));
    expect((await cancelar()).status).toBe(400);
  });
});

describe('Liquidación de metal', () => {
  const MATERIAL = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const liquidar = (finalPieceWeight: number, scrapWeight: number) =>
    request(app)
      .post('/api/orders/p-1/metal-return')
      .set('Authorization', token('JOYERO'))
      .send({ materialId: MATERIAL, finalPieceWeight, scrapWeight });
  const preparar = () => {
    db.order.findUnique.mockResolvedValue(pedido({ materialsUsed: [{ quantity: 60 }, { quantity: 40 }] }));
    db.material.findUnique.mockResolvedValue({ id: MATERIAL, name: 'Oro 18K', unit: 'GRAMOS', stock: 10 });
    db.material.update.mockResolvedValue({ stock: 12 });
    db.auditLog.create.mockResolvedValue({ id: 'log-1' });
  };

  it('P14 calcula la merma, reintegra la limalla y audita', async () => {
    preparar();
    const r = await liquidar(93, 2);
    expect(r.status).toBe(200);
    expect(r.body.balance).toMatchObject({
      metalEntregado: 100, mermaTecnica: 5, porcentajeMerma: '5%', mermaInusual: false,
    });
    expect(r.body).toMatchObject({ nuevoStockMaterial: 12, unidad: 'GRAMOS', auditId: 'log-1' });
    expect(db.material.update.mock.calls[0][0].data.stock).toEqual({ increment: 2 });
    expect(db.auditLog.create.mock.calls[0][0].data).toMatchObject({
      action: 'LIQUIDACION_METAL_MERMA',
      details: { materialName: 'Oro 18K', mermaTecnica: 5, observaciones: 'Liquidación estándar de taller' },
    });
    expect(db.orderStatusHistory.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    [92, false],
    [91.9, true],
  ])('P15 umbral de merma del 8 por ciento: joya de %s g, inusual %s', async (joya, esperado) => {
    preparar();
    const r = await liquidar(joya, 0);
    expect(r.body.balance.mermaInusual).toBe(esperado);
    expect(db.material.update).not.toHaveBeenCalled();
    expect(r.body.nuevoStockMaterial).toBe(10);
  });

  it('P16 rechaza devolver más metal del entregado', async () => {
    preparar();
    const r = await liquidar(99, 2);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe(
      'El peso total devuelto (101 GRAMOS) excede el material entregado (100 GRAMOS)'
    );
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it('P17 rechaza liquidar un pedido sin consumos de ese material', async () => {
    db.order.findUnique.mockResolvedValue(pedido({ materialsUsed: [] }));
    expect((await liquidar(1, 0)).body.error).toContain('no tiene registros de consumo');
  });
});
