import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import app from '../src/app.js';
import { prismaMock as db, token } from './ayudas.js';

describe('Autenticación y permisos', () => {
  it('P27 inicia sesión y entrega un token firmado con JWT_SECRET', async () => {
    const passwordHash = await bcrypt.hash('clave-prueba', 4);
    db.user.findUnique.mockResolvedValue({
      id: 'u-1', email: 'a@example.com', fullName: 'A', role: 'ADMIN', passwordHash,
    });
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@example.com', password: 'clave-prueba' });
    expect(r.status).toBe(200);
    expect(jwt.verify(r.body.token, 'secreto-solo-para-pruebas')).toMatchObject({ id: 'u-1', role: 'ADMIN' });
    expect(r.body.user.passwordHash).toBeUndefined();
  });

  it('P28 responde 401 con credenciales inválidas', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const r = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'x' });
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('Credenciales inválidas');
  });

  it('P29 exige token y rechaza uno inválido', async () => {
    expect((await request(app).get('/api/orders')).status).toBe(401);
    const r = await request(app).get('/api/orders').set('Authorization', token('ADMIN', 'otro'));
    expect(r.status).toBe(401);
  });

  it('P30 no permite que un JOYERO registre abonos', async () => {
    const r = await request(app)
      .post('/api/orders/p-1/payments')
      .set('Authorization', token('JOYERO'))
      .send({ amount: 1, paymentMethod: 'EFECTIVO' });
    expect(r.status).toBe(403);
  });

  it('P31 [defecto] sin JWT_SECRET no acepta tokens firmados con el secreto de respaldo', async () => {
    vi.stubEnv('JWT_SECRET', '');
    db.order.count.mockResolvedValue(0);
    db.order.findMany.mockResolvedValue([]);
    const r = await request(app)
      .get('/api/orders')
      .set('Authorization', token('ADMIN', 'secret_fallback'));
    expect(r.status).not.toBe(200);
  });
});

describe('Manejo de errores', () => {
  it('P32 devuelve 404 si el pedido no existe', async () => {
    db.order.findUnique.mockResolvedValue(null);
    const r = await request(app).get('/api/orders/nada').set('Authorization', token());
    expect(r.status).toBe(404);
  });

  it('P33 un fallo al consultar la base responde 500 sin revelar el detalle', async () => {
    db.order.findMany.mockRejectedValue(new Error('conexión perdida'));
    db.order.count.mockResolvedValue(0);
    const r = await request(app).get('/api/orders').set('Authorization', token());
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain('conexión perdida');
  });

  it('P34 [defecto] un fallo interno al abonar responde 500 sin revelar el detalle', async () => {
    db.order.findUnique.mockRejectedValue(new Error('timeout en db-interna:5432'));
    const r = await request(app)
      .post('/api/orders/p-1/payments')
      .set('Authorization', token())
      .send({ amount: 10, paymentMethod: 'EFECTIVO' });
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain('db-interna');
  });

  it('P35 un correo de cliente repetido responde con un mensaje claro', async () => {
    db.client.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('x', { code: 'P2002', clientVersion: '6' })
    );
    const r = await request(app)
      .post('/api/clients')
      .set('Authorization', token())
      .send({ fullName: 'Ana', phone: '300' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('El documento o correo ya está registrado');
  });

  it('P36 asignar un joyero inexistente responde con error de negocio', async () => {
    db.order.findUnique.mockResolvedValue({ id: 'p-1', status: 'CREADO' });
    db.user.findUnique.mockResolvedValue(null);
    const r = await request(app)
      .patch('/api/orders/p-1/artisan')
      .set('Authorization', token())
      .send({ artisanId: 'zz' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('Joyero no encontrado');
  });
});
