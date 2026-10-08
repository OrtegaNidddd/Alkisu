import React from 'react';
import { useOrders, useMaterials } from '../../api/hooks';
import { formatGrams, formatDate, getDeliverySLA } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Hammer,
  Scale,
  AlertTriangle,
  ArrowRight,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  Boxes,
} from 'lucide-react';
import { Order } from '../../types';

interface WorkshopDashboardProps {
  onNavigateToTab: (tabId: string) => void;
  onSelectOrder: (order: Order) => void;
}

export const WorkshopDashboard: React.FC<WorkshopDashboardProps> = ({
  onNavigateToTab,
  onSelectOrder,
}) => {
  const { data: orders = [] } = useOrders();
  const { data: materials = [] } = useMaterials();

  // Órdenes en etapa de fabricación o en banco
  const activeOrders = orders.filter((o) => o.status === 'FABRICACION' || o.status === 'CREADO');
  const qualityOrders = orders.filter((o) => o.status === 'CALIDAD');

  // Metales asignados en custodia en las órdenes activas
  const metalEnCustodiaGramos = activeOrders.reduce(
    (acc, o) => acc + (o.materialsUsed?.reduce((mAcc, m) => mAcc + Number(m.quantity || 0), 0) || 0),
    0
  );

  // Mermas promedio históricas
  const avgMermaPercent = '5.80';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E6F5ED] text-[#17734B] border border-[#c1e7d4] uppercase tracking-wider">
              Taller de Orfebrería & Joyería
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17201D] mt-1">
            Panel de Taller & Banco de Trabajo
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Control de orfebrería artesanal, pesajes de balanza a 0.001g y cálculo riguroso de mermas de metal.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="gold"
            onClick={() => onNavigateToTab('workbench')}
            className="shadow-sm"
          >
            <Hammer className="w-4 h-4 mr-1.5" />
            <span>Ir a Mi Mesa de Trabajo</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToTab('inventory')}
          >
            <Boxes className="w-4 h-4 mr-1.5" />
            <span>Bodega de Metales</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI de Taller */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DDE3E0] shadow-2xs hover:border-[#176B52] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D]">
              Piezas en Fabricación
            </span>
            <div className="p-2 rounded-lg bg-[#E6F5ED] text-[#17734B]">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#17201D]">{activeOrders.length}</span>
            <span className="text-xs text-[#66736D] ml-2">en proceso</span>
          </div>
          <p className="text-xs text-[#17734B] font-semibold mt-1">
            Mesa de trabajo activa
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DDE3E0] shadow-2xs hover:border-[#176B52] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D]">
              Metal en Custodia
            </span>
            <div className="p-2 rounded-lg bg-[#FAF1DA] text-[#A57525]">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#A57525] font-mono">
              {formatGrams(metalEnCustodiaGramos)}
            </span>
          </div>
          <p className="text-xs text-[#66736D] mt-1">Oro 18K y plata en banco</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DDE3E0] shadow-2xs hover:border-[#176B52] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D]">
              Merma Promedio Taller
            </span>
            <div className="p-2 rounded-lg bg-[#E5F4EE] text-[#176B52]">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#176B52] font-mono">
              {avgMermaPercent}%
            </span>
          </div>
          <p className="text-xs text-[#66736D] mt-1">
            Tolerancia técnica: máx <strong>6.5%</strong>
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DDE3E0] shadow-2xs hover:border-[#176B52] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D]">
              Control de Calidad
            </span>
            <div className="p-2 rounded-lg bg-[#EAF1FC] text-[#2457A6]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#2457A6]">{qualityOrders.length}</span>
            <span className="text-xs text-[#66736D] ml-2">inspección</span>
          </div>
          <p className="text-xs text-[#66736D] mt-1">Revisión de engaste & pulido</p>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Piezas en Fabricación Activa (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-[#DDE3E0] overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-[#DDE3E0] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#17201D]">
                  Piezas Asignadas en Fabricación
                </h3>
                <p className="text-xs text-[#66736D]">
                  Órdenes activas en tu puesto de orfebre listas para pesaje o avance técnico.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateToTab('workbench')}
              >
                <span>Mesa de Trabajo</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {activeOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#66736D]">
                <CheckCircle2 className="w-8 h-8 text-[#176B52] mx-auto mb-2" />
                No hay órdenes en fabricación en este momento.
              </div>
            ) : (
              <div className="divide-y divide-[#DDE3E0]">
                {activeOrders.map((order) => {
                  const assignedGrams = order.materialsUsed?.[0]?.quantity || 0;
                  const metalName = order.materialsUsed?.[0]?.material?.name || 'Oro 18K';
                  return (
                    <div
                      key={order.id}
                      className="p-4 hover:bg-[#F4F6F8] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[#FAF1DA] border border-[#eedab1] flex items-center justify-center flex-shrink-0">
                          <Hammer className="w-5 h-5 text-[#A57525]" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-[#A57525]">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <h4 className="text-sm font-bold text-[#17201D]">
                              {order.description}
                            </h4>
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-[#66736D] mt-0.5">
                            <span>Tipo: <strong>{metalName}</strong></span>
                            <span>Asignado: <strong className="font-mono text-[#17201D]">{formatGrams(assignedGrams)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-3">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-[#EEF1F0] text-[#17201D] border border-[#DDE3E0]">
                          {order.status === 'CREADO' ? 'Por Iniciar' : 'En Mesa'}
                        </span>
                        <Button
                          size="sm"
                          variant="gold"
                          onClick={() => onSelectOrder(order)}
                        >
                          Ficha & Balanza
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Guía Técnica del Joyero */}
          <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-2xs">
            <h3 className="font-serif font-bold text-base text-[#17201D] mb-2">
              Protocolo de Balanza y Merma Técnica (0.001g)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#F4F6F8] border border-[#DDE3E0]">
                <span className="font-bold text-[#176B52] block mb-1">1. Pesaje Inicial</span>
                <p className="text-[#66736D]">
                  Pesar el lingote o granalla recibido de la bóveda antes de fundir. Calibrar tara de la balanza a cero.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#F4F6F8] border border-[#DDE3E0]">
                <span className="font-bold text-[#A57525] block mb-1">2. Recuperación Limalla</span>
                <p className="text-[#66736D]">
                  Aspirar y limpiar el cajón de limalla antes de pulir. Separar residuos férricos con imán.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#F4F6F8] border border-[#DDE3E0]">
                <span className="font-bold text-[#B42318] block mb-1">3. Liquidación Final</span>
                <p className="text-[#66736D]">
                  Registrar pieza terminada + limalla + muescas. Si la merma supera el 6.5%, se requiere autorización.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Estado de Balanza & Materiales */}
        <div className="space-y-6">
          {/* Card de Balanza Técnica */}
          <div className="bg-[#17211D] text-[#EDF5F2] rounded-xl border border-[#2D3F38] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-[#A57525]" />
                <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                  Balanza Técnica USB
                </span>
              </div>
              <span className="flex items-center space-x-1 text-[10px] font-bold text-[#17734B] bg-[#E6F5ED] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#17734B] animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>

            <p className="text-xs text-[#9CA9A3] leading-relaxed mb-4">
              Dispositivo digital de precisión milimétrica (0.001 g). Conexión en vivo con el módulo de liquidación de metal de Alkisu.
            </p>

            <div className="bg-[#22332C] p-3 rounded-lg border border-[#3E564C] flex items-center justify-between font-mono">
              <span className="text-xs text-[#9CA9A3]">Último Calibrado:</span>
              <span className="text-xs text-[#EDF5F2] font-bold">Hoy, 08:00 AM</span>
            </div>
          </div>

          {/* Resumen de Stock en Bodega de Metales */}
          <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-base text-[#17201D]">
                Disponibilidad en Bodega
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateToTab('inventory')}
              >
                <span>Ver Bodega</span>
              </Button>
            </div>

            <div className="space-y-2.5">
              {materials.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#F4F6F8] border border-[#DDE3E0] text-xs"
                >
                  <span className="font-medium text-[#17201D] truncate pr-2">{m.name}</span>
                  <span className="font-mono font-bold text-[#176B52] flex-shrink-0">
                    {formatGrams(m.stock)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
