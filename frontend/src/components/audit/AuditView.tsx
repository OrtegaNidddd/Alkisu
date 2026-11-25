import React, { useState, useMemo } from 'react';
import { useOrders, useAuditLogs } from '../../api/hooks';
import { formatDate } from '../../utils/formatters';
import { ShieldCheck, Scale, AlertTriangle, FileText, Search, RefreshCw, Layers } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const AuditView: React.FC = () => {
  const { data: rawAuditLogs = [], refetch: refetchAudit } = useAuditLogs();
  const { data: orders = [], refetch: refetchOrders } = useOrders();
  const [activeFilter, setActiveFilter] = useState<'all' | 'metal' | 'status' | 'warehouse'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Consolidar todos los eventos de auditoría desde AuditLog y el historial de órdenes
  const allEntries = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. Logs de auditoría de la base de datos
    (rawAuditLogs || []).forEach((log: any) => {
      seenIds.add(log.id);
      const isMetal =
        log.action === 'LIQUIDACION_METAL_ORDEN' ||
        log.note?.includes('Balance de metal') ||
        log.note?.includes('Liquidación');
      const isCancel = log.toStatus === 'CANCELADO' || log.action?.includes('CANCEL');
      const isWarehouse =
        log.action === 'REABASTECIMIENTO_MATERIAL' ||
        log.action === 'ACTUALIZACION_MATERIAL' ||
        log.action === 'CONSUMO_MATERIAL_PEDIDO' ||
        log.tableName === 'Material';

      list.push({
        id: log.id,
        createdAt: log.createdAt,
        orderId: log.orderId || (log.tableName === 'Order' ? log.recordId : null),
        userName: log.user?.fullName || 'Sistema Papoi',
        action: log.action,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        note:
          log.note ||
          (log.details && typeof log.details === 'object'
            ? log.details.materialName
              ? `${log.action}: ${log.details.materialName} (Stock: ${log.details.nuevoStock || log.details.cantidadIngresada || ''})`
              : JSON.stringify(log.details)
            : 'Registro de auditoría técnica'),
        isMetalReturn: isMetal,
        isCancel,
        isWarehouse,
      });
    });

    // 2. Historial de estados de las órdenes
    orders.forEach((o) => {
      (o.statusHistory || []).forEach((sh) => {
        const id = sh.id || `sh-${o.id}-${sh.createdAt}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const isMetal =
            sh.note?.includes('Balance de metal') || sh.note?.includes('Liquidación');
          list.push({
            id,
            createdAt: sh.createdAt,
            orderId: o.id,
            userName: sh.user?.fullName || 'Taller Central',
            action: `TRANSICION_${sh.toStatus}`,
            fromStatus: sh.fromStatus,
            toStatus: sh.toStatus,
            note: sh.note || `${sh.fromStatus} → ${sh.toStatus}`,
            isMetalReturn: isMetal,
            isCancel: sh.toStatus === 'CANCELADO',
            isWarehouse: false,
          });
        }
      });
    });

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [rawAuditLogs, orders]);

  // Filtrado por categoría y búsqueda
  const filteredEntries = allEntries.filter((entry) => {
    if (activeFilter === 'metal' && !entry.isMetalReturn) return false;
    if (activeFilter === 'status' && !entry.fromStatus && !entry.toStatus) return false;
    if (activeFilter === 'warehouse' && !entry.isWarehouse) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (entry.orderId && entry.orderId.toLowerCase().includes(term)) ||
      (entry.userName && entry.userName.toLowerCase().includes(term)) ||
      (entry.action && entry.action.toLowerCase().includes(term)) ||
      (entry.note && entry.note.toLowerCase().includes(term))
    );
  });

  const metalCount = allEntries.filter((e) => e.isMetalReturn).length;

  const handleRefresh = () => {
    refetchAudit();
    refetchOrders();
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17201D]">
            Auditoría Inmutable & Control de Mermas
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Registro cronológico inmutable de pesajes de mesa, transiciones técnicas y movimientos de insumos.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Actualizar Registro
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-[#DDE3E0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block">
            Total Eventos Auditados
          </span>
          <p className="text-2xl font-mono font-bold text-[#17201D] mt-1">
            {allEntries.length}
          </p>
          <span className="text-xs text-[#66736D] mt-1 block">Trazabilidad forense inmutable</span>
        </div>

        <div
          onClick={() => setActiveFilter('metal')}
          className="p-4 bg-[#FAF1DA] rounded-xl border border-[#eedab1] cursor-pointer hover:shadow-2xs transition shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525]">
              Cierres de Mesa & Balanza
            </span>
            <Scale className="w-4 h-4 text-[#A57525]" />
          </div>
          <p className="text-2xl font-mono font-bold text-[#A57525] mt-1">
            {metalCount}
          </p>
          <span className="text-xs text-[#A57525] mt-1 block font-medium">
            Liquidaciones de merma y retorno de metal
          </span>
        </div>

        <div className="p-4 bg-[#E6F5ED] rounded-xl border border-[#c1e7d4] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#17734B]">
              Integridad del Sistema
            </span>
            <ShieldCheck className="w-4 h-4 text-[#17734B]" />
          </div>
          <p className="text-base font-bold text-[#17734B] mt-1">
            100% Protegido
          </p>
          <span className="text-xs text-[#17734B] mt-1 block">Cero registros alterables</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DDE3E0] shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeFilter === 'all'
                ? 'bg-[#176B52] text-white shadow-2xs'
                : 'bg-[#F4F6F8] text-[#66736D] hover:text-[#17201D]'
            }`}
          >
            Todos ({allEntries.length})
          </button>
          <button
            onClick={() => setActiveFilter('metal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
              activeFilter === 'metal'
                ? 'bg-[#A57525] text-white shadow-2xs'
                : 'bg-[#FAF1DA] text-[#A57525] hover:bg-[#fae8b2]'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Mermas / Balanza ({metalCount})</span>
          </button>
          <button
            onClick={() => setActiveFilter('status')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeFilter === 'status'
                ? 'bg-[#2457A6] text-white shadow-2xs'
                : 'bg-[#EAF1FC] text-[#2457A6] hover:bg-[#d8e6fc]'
            }`}
          >
            Transiciones de Fase
          </button>
          <button
            onClick={() => setActiveFilter('warehouse')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeFilter === 'warehouse'
                ? 'bg-[#17734B] text-white shadow-2xs'
                : 'bg-[#E6F5ED] text-[#17734B] hover:bg-[#d2eedf]'
            }`}
          >
            Bodega / Insumos
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#9CA9A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por orden, usuario o nota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
          />
        </div>
      </div>

      {/* Tabla Deslizable */}
      <div className="bg-white rounded-xl border border-[#DDE3E0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[680px] text-xs text-left">
            <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Fecha / Hora</th>
                <th className="py-3 px-4 whitespace-nowrap">Orden / Registro</th>
                <th className="py-3 px-4 whitespace-nowrap">Responsable</th>
                <th className="py-3 px-4 whitespace-nowrap">Evento / Acción</th>
                <th className="py-3 px-4">Constancia Técnica & Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3E0]">
              {filteredEntries.map((entry, idx) => (
                <tr key={entry.id || idx} className="hover:bg-[#F4F6F8]/60 transition">
                  <td className="py-3.5 px-4 font-mono text-[#66736D] whitespace-nowrap">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#A57525] whitespace-nowrap">
                    {entry.orderId ? `#${entry.orderId.toUpperCase()}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#17201D] whitespace-nowrap">
                    {entry.userName}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {entry.isMetalReturn ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAF1DA] text-[#A57525] border border-[#eedab1]">
                        <Scale className="w-3 h-3" />
                        <span>Liquidación Balanza</span>
                      </span>
                    ) : entry.isCancel ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FDECEA] text-[#B42318] border border-[#f9c5c0]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Cancelación</span>
                      </span>
                    ) : entry.fromStatus && entry.toStatus ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F0] text-[#17201D]">
                        {entry.fromStatus} → {entry.toStatus}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5F4EE] text-[#176B52]">
                        {entry.action}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#17201D] font-mono text-[11px]">
                    {entry.note}
                  </td>
                </tr>
              ))}

              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#9CA9A3]">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-[#9CA9A3]" />
                    <p className="text-xs font-semibold text-[#17201D]">
                      No hay registros de auditoría que coincidan con el filtro
                    </p>
                    <p className="text-[11px] text-[#66736D] mt-1 max-w-sm mx-auto">
                      Las liquidaciones de balanza, pesajes de mermas, consumos de insumos y cambios de fase se registran automáticamente.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
