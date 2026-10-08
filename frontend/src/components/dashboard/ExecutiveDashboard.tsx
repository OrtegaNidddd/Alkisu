import React, { useState } from 'react';
import { useDashboardMetrics, useOrders, useUsers, useMaterials } from '../../api/hooks';
import { formatCurrency, formatGrams, formatDate, getDeliverySLA } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RegisterUserModal } from '../admin/RegisterUserModal';
import { RestockModal } from '../inventory/RestockModal';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Hammer,
  ShieldAlert,
  ArrowRight,
  Boxes,
  FileCheck,
  CheckCircle2,
  UserPlus,
  Users,
  Shield,
  UserCheck,
  Plus,
} from 'lucide-react';
import { Order, Material } from '../../types';

interface ExecutiveDashboardProps {
  onNavigateToTab: (tabId: string) => void;
  onSelectOrder: (order: Order) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  onNavigateToTab,
  onSelectOrder,
}) => {
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { data: orders = [] } = useOrders();
  const { data: users = [], refetch: refetchUsers } = useUsers();
  const { data: materials = [] } = useMaterials();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [restockMaterial, setRestockMaterial] = useState<Material | null>(null);

  // Órdenes con entrega pactada para los próximos 7 días
  const next7DaysOrders = orders.filter((o) => {
    if (!o.estimatedDelivery || o.status === 'ENTREGADO' || o.status === 'CANCELADO') return false;
    const delivery = new Date(o.estimatedDelivery);
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    return delivery <= nextWeek;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17201D]">
            Panel Ejecutivo & Control de Operaciones
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Consolidado financiero, gestión de colaboradores autorizados y control de pérdidas por merma.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsRegisterModalOpen(true)}
            className="shadow-sm"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            <span>+ Registrar Personal</span>
          </Button>

          <Button
            size="sm"
            variant="gold"
            onClick={() => onNavigateToTab('orders')}
          >
            <span>Ver Tablero</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Tarjetas de Resumen Métrico Principal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudado */}
        <div className="p-5 bg-white rounded-2xl border border-[#DDE3E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D]">
              Dinero Recaudado
            </span>
            <div className="p-2 rounded-lg bg-[#E6F5ED] text-[#17734B]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-[#17734B]">
            {formatCurrency(metrics?.financiero.totalRecaudado || 0)}
          </p>
          <span className="text-xs text-[#66736D] block">Abonos efectivos en caja</span>
        </div>

        {/* Cartera Pendiente en Calle */}
        <div className="p-5 bg-white rounded-2xl border border-[#DDE3E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D]">
              Cartera Pendiente en Calle
            </span>
            <div className="p-2 rounded-lg bg-[#FFF4D6] text-[#9A6700]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-[#9A6700]">
            {formatCurrency(metrics?.financiero.carteraPendiente || 0)}
          </p>
          <span className="text-xs text-[#66736D] block">Cobro obligatorio contra entrega</span>
        </div>

        {/* Joyas en Proceso */}
        <div className="p-5 bg-white rounded-2xl border border-[#DDE3E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D]">
              Joyas en Taller (Mesa & Calidad)
            </span>
            <div className="p-2 rounded-lg bg-[#E5F4EE] text-[#176B52]">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-[#17201D]">
            {(metrics?.taller.enFabricacion || 0) + (metrics?.taller.enControlCalidad || 0)}
          </p>
          <span className="text-xs text-[#66736D] block">
            {metrics?.taller.enFabricacion || 0} en forja, {metrics?.taller.enControlCalidad || 0} en calidad
          </span>
        </div>

        {/* Alertas de Stock Bajo */}
        <div
          onClick={() => onNavigateToTab('inventory')}
          className="p-5 bg-[#FAF1DA] rounded-2xl border border-[#eedab1] shadow-xs space-y-3 cursor-pointer hover:border-[#A57525] transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525]">
              Alertas de Stock Crítico
            </span>
            <div className="p-2 rounded-lg bg-[#FFF4D6] text-[#9A6700]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-bold text-[#A57525]">
            {metrics?.inventario.materialesCriticosCount || 0}
          </p>
          <span className="text-xs text-[#A57525] font-semibold block">
            Metales por debajo de reserva
          </span>
        </div>
      </div>

      {/* Sección Doble: Órdenes Próximas vs Alertas de Metales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entregas pactadas en próximos 7 días */}
        <div className="bg-white rounded-2xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#176B52]" />
              <h3 className="font-serif font-bold text-base text-[#17201D]">
                Entregas Pactadas (Próximos 7 Días)
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E5F4EE] text-[#176B52] font-bold">
              {next7DaysOrders.length} joyas
            </span>
          </div>

          <div className="space-y-3">
            {next7DaysOrders.map((ord) => {
              const sla = getDeliverySLA(ord.estimatedDelivery);
              return (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className="p-3.5 rounded-xl border border-[#DDE3E0] bg-[#F4F6F8] hover:border-[#176B52] hover:bg-white transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-[#A57525]">
                        #{ord.id.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-[#17201D] truncate">
                        {ord.client?.fullName}
                      </span>
                    </div>
                    <p className="text-xs text-[#66736D] truncate">
                      {ord.description}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border block mb-1 ${sla.badgeClass}`}>
                      {sla.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#17201D]">
                      {formatCurrency(ord.totalPactado)}
                    </span>
                  </div>
                </div>
              );
            })}
            {next7DaysOrders.length === 0 && (
              <div className="py-8 text-center text-xs text-[#9CA9A3]">
                No hay entregas pendientes con vencimiento dentro de los próximos 7 días.
              </div>
            )}
          </div>
        </div>

        {/* Alertas de Metales Críticos */}
        <div className="bg-white rounded-2xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Boxes className="w-5 h-5 text-[#A57525]" />
              <h3 className="font-serif font-bold text-base text-[#17201D]">
                Materiales en Nivel Crítico de Bóveda
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('inventory')}
            >
              Ir a Bodega
            </Button>
          </div>

          <div className="space-y-3">
            {(metrics?.inventario.alertasStock || []).map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-xl border border-[#fce49f] bg-[#FFF4D6]/30 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-[#17201D]">
                    {alert.nombre}
                  </h4>
                  <p className="text-[11px] text-[#66736D] mt-0.5">
                    Stock mínimo requerido: <strong>{formatGrams(alert.stockMinimo, alert.unidad)}</strong>
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="font-mono text-sm font-bold text-[#9A6700] block">
                    {formatGrams(alert.stockActual, alert.unidad)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const mat = materials.find((m) => m.id === alert.id) || ({
                        id: alert.id,
                        name: alert.nombre,
                        stock: alert.stockActual,
                        minStock: alert.stockMinimo,
                        unit: alert.unidad || 'GRAMOS',
                        type: 'ORO_AMARILLO_18K',
                        costPerGram: 0,
                      } as Material);
                      setRestockMaterial(mat);
                    }}
                    className="mt-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-[#FAF1DA] text-[#A57525] border border-[#eedab1] hover:bg-[#A57525] hover:text-white transition flex items-center space-x-1 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Reabastecer</span>
                  </button>
                </div>
              </div>
            ))}
            {(!metrics?.inventario.alertasStock || metrics.inventario.alertasStock.length === 0) && (
              <div className="py-8 text-center text-xs text-[#17734B] flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 mb-1 text-[#17734B]" />
                <span>Todos los metales y piedras se encuentran sobre el stock de seguridad.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección Exclusiva de Administración: Equipo y Personal */}
      <div className="bg-white rounded-2xl border border-[#DDE3E0] p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#FAF1DA] text-[#A57525]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#17201D]">
                Equipo & Personal de Joyería Autorizado
              </h3>
              <p className="text-xs text-[#66736D]">
                Cuentas activas en el sistema ERP. Solo la Dirección General puede crear nuevos colaboradores.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRegisterModalOpen(true)}
            className="border-[#176B52] text-[#176B52] hover:bg-[#E5F4EE]"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            <span>+ Registrar Nuevo Personal</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-xl border border-[#DDE3E0] bg-[#F4F6F8] hover:border-[#176B52] transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-[#176B52] text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                  {u.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#17201D] truncate">{u.fullName}</p>
                  <p className="text-[11px] text-[#66736D] truncate">{u.email}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border flex-shrink-0 ml-2 ${
                  u.role === 'ADMIN'
                    ? 'bg-[#FAF1DA] text-[#A57525] border-[#eedab1]'
                    : u.role === 'ASESOR'
                    ? 'bg-[#EAF1FC] text-[#2457A6] border-[#c6daf7]'
                    : 'bg-[#E6F5ED] text-[#17734B] border-[#c1e7d4]'
                }`}
              >
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Registro de Personal exclusivo para Admin */}
      <RegisterUserModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onUserRegistered={() => refetchUsers()}
      />

      {/* Modal de Reabastecimiento de Material */}
      <RestockModal
        material={restockMaterial}
        isOpen={!!restockMaterial}
        onClose={() => setRestockMaterial(null)}
      />
    </div>
  );
};
