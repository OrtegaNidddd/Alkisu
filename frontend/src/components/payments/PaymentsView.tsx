import React from 'react';
import { useOrders } from '../../api/hooks';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CreditCard, DollarSign, Printer, ArrowUpRight } from 'lucide-react';
import { Order } from '../../types';

interface PaymentsViewProps {
  onSelectOrder: (order: Order) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onSelectOrder }) => {
  const { data: orders = [] } = useOrders();

  // Consolidar todos los abonos de todas las órdenes
  const allPayments = orders.flatMap((o) =>
    (o.payments || []).map((p) => ({
      ...p,
      order: o,
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalRecaudado = allPayments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#17201D]">
            Caja & Control de Abonos
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Registro consolidado de anticipos, cancelaciones totales y comprobantes de pago emitidos.
          </p>
        </div>

        <div className="p-3 bg-[#E6F5ED] border border-[#c1e7d4] rounded-xl flex items-center space-x-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#17734B] block">
              Total Histórico Recaudado
            </span>
            <span className="font-mono text-base font-bold text-[#17734B]">
              {formatCurrency(totalRecaudado)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de Abonos */}
      <div className="bg-white rounded-xl border border-[#DDE3E0] overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Fecha & Hora</th>
              <th className="py-3 px-4">Orden / Joya</th>
              <th className="py-3 px-4">Cliente</th>
              <th className="py-3 px-4">Método</th>
              <th className="py-3 px-4">Referencia</th>
              <th className="py-3 px-4 text-right">Monto Abonado</th>
              <th className="py-3 px-4 text-center">Ficha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDE3E0]">
            {allPayments.map((pay) => (
              <tr key={pay.id} className="hover:bg-[#F4F6F8]/60 transition">
                <td className="py-3 px-4 font-mono text-[#66736D]">
                  {formatDate(pay.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono font-bold text-[#A57525] block">
                    #{pay.order.id.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-[#66736D] truncate max-w-xs block">
                    {pay.order.description}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-[#17201D]">
                  {pay.order.client?.fullName}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F0] text-[#17201D]">
                    {pay.paymentMethod}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#66736D]">
                  {pay.referenceNotes || 'Anticipo estándar'}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-sm text-[#17734B]">
                  {formatCurrency(pay.amount)}
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => onSelectOrder(pay.order)}
                    className="p-1.5 text-[#176B52] hover:bg-[#E5F4EE] rounded-lg transition"
                    title="Ver orden"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {allPayments.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#9CA9A3]">
                  No se han registrado abonos en el sistema aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
