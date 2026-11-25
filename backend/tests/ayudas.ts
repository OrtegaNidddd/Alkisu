import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

const modelo = () => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
});

const modelos = {
  order: modelo(),
  payment: modelo(),
  material: modelo(),
  orderMaterial: modelo(),
  orderStatusHistory: modelo(),
  auditLog: modelo(),
  quote: modelo(),
  quoteItem: modelo(),
  user: modelo(),
  client: modelo(),
};

export const prismaMock = { ...modelos, $transaction: vi.fn() };

export const enviarCorreo = vi.fn();

export const reiniciarPrisma = () => {
  for (const m of Object.values(modelos)) {
    for (const f of Object.values(m)) f.mockReset();
  }
  prismaMock.$transaction
    .mockReset()
    .mockImplementation((arg: unknown) =>
      typeof arg === 'function' ? arg(prismaMock) : Promise.all(arg as Promise<unknown>[])
    );
};

export const token = (role = 'ADMIN', secreto = 'secreto-solo-para-pruebas') =>
  `Bearer ${jwt.sign({ id: 'u-1', email: 'u@example.com', role }, secreto)}`;

export const pedido = (extra: Record<string, unknown> = {}) => ({
  id: 'p-1',
  status: 'CALIDAD',
  artisanId: 'j-1',
  totalPactado: 1000,
  payments: [] as { amount: number }[],
  ...extra,
});
