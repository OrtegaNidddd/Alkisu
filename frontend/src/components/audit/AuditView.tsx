import React from 'react';
import { useOrders } from '../../api/hooks';
import { formatDate } from '../../utils/formatters';
import { ShieldCheck, Scale, AlertTriangle, FileText } from 'lucide-react';

export const AuditView: React.FC = () => {
  const { data: orders = [] } = useOrders();

  // Consolidar todos los eventos de auditoría desde el historial inmutable
  const auditEntries = orders.flatMap((o) =>
    (o.statusHistory || []).map((sh) => ({
      ...sh,
      order: o,
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#17201D]">
            Auditoría Inmutable & Control de Mermas
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Registro de trazabilidad criptográfica y balances de metal cerrados en taller.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#DDE3E0] overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Fecha / Hora</th>
              <th className="py-3 px-4">Orden</th>
              <th className="py-3 px-4">Responsable</th>
              <th className="py-3 px-4">Evento / Transición</th>
              <th className="py-3 px-4">Constancia Técnica & Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDE3E0]">
            {auditEntries.map((entry, idx) => {
              const isMetalReturn = entry.note?.includes('Balance de metal') || entry.note?.includes('Liquidación');
              const isCancel = entry.toStatus === 'CANCELADO';

              return (
                <tr key={idx} className="hover:bg-[#F4F6F8]/60 transition">
                  <td className="py-3.5 px-4 font-mono text-[#66736D]">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#A57525]">
                    #{entry.order.id.toUpperCase()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#17201D]">
                    {entry.user?.fullName || 'Taller Central'}
                  </td>
                  <td className="py-3.5 px-4">
                    {isMetalReturn ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF1DA] text-[#A57525] border border-[#eedab1]">
                        <Scale className="w-3 h-3" />
                        <span>Liquidación Balanza</span>
                      </span>
                    ) : isCancel ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDECEA] text-[#B42318] border border-[#f9c5c0]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Cancelación</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F0] text-[#17201D]">
                        {entry.fromStatus} → {entry.toStatus}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#17201D] font-mono text-[11px]">
                    {entry.note || 'Sin observaciones'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
