// Pruebas unitarias de los componentes creados en la refactorización (no existían antes).
import { describe, expect, it } from 'vitest';
import { calcularSaldo } from '../src/domain/saldo.js';
import { PoliticaContadoEstrictoStrategy } from '../src/domain/politica-entrega.js';
import { validarTransicion } from '../src/domain/transiciones-pedido.js';
import { calcularBalanceMetal } from '../src/domain/balance-metal.js';
import { construirItems } from '../src/domain/items-cotizacion.js';

describe('Dominio', () => {
  it('N01 calcula el saldo con valores de texto y sin abonos', () => {
    expect(calcularSaldo({ totalPactado: '1500', payments: [] }).saldoPendiente).toBe(1500);
    expect(calcularSaldo({ totalPactado: 100, payments: [{ amount: '40' }] }).saldoPendiente).toBe(60);
  });

  it('N02 la política exige CALIDAD y saldo en cero', () => {
    const politica = new PoliticaContadoEstrictoStrategy();
    expect(politica.validarEntrega({ status: 'CALIDAD', saldoPendiente: 0 })).toEqual({ esValido: true });
    expect(politica.validarEntrega({ status: 'CALIDAD', saldoPendiente: 1 }).esValido).toBe(false);
    expect(politica.validarEntrega({ status: 'FABRICACION', saldoPendiente: 0 }).esValido).toBe(false);
  });

  it('N03 permite el reproceso y rechaza saltos de estado', () => {
    expect(() => validarTransicion('CALIDAD', 'FABRICACION')).not.toThrow();
    expect(() => validarTransicion('CREADO', 'CALIDAD')).toThrow('Transición no permitida');
    expect(() => validarTransicion('CANCELADO', 'FABRICACION')).toThrow();
  });

  it('N04 calcula la merma y rechaza devoluciones excesivas', () => {
    expect(calcularBalanceMetal(10, 9, 0.5, 'GRAMOS')).toEqual({
      merma: 0.5, porcentajeMerma: 5, mermaInusual: false,
    });
    expect(() => calcularBalanceMetal(10, 10, 1, 'GRAMOS')).toThrow('excede el material entregado');
  });

  it('N05 arma los ítems de una cotización', () => {
    const r = construirItems([{ description: 'Anillo', quantity: 3, unitPrice: 50 }]);
    expect(r.totalAmount).toBe(150);
    expect(r.items.create[0].subtotal).toBe(150);
  });
});
