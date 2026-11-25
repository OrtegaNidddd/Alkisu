import React, { useState, useMemo } from 'react';
import { useDashboardMetrics, useOrders, useUsers, useMaterials, useQuotes } from '../../api/hooks';
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
  Layers,
  Sparkles,
  ChevronRight,
  CreditCard,
  Flame,
  Scale,
  Award,
} from 'lucide-react';
import { Order, Material, OrderStatus } from '../../types';

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
  const { data: quotes = [] } = useQuotes();

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [restockMaterial, setRestockMaterial] = useState<Material | null>(null);
  const [deliveryFilter, setDeliveryFilter] = useState<'ALL' | 'URGENT' | 'UPCOMING'>('ALL');

  // 1. Cálculos Financieros Consolidados
  const totalFacturado = metrics?.financiero.totalFacturado || orders.reduce((acc, o) => acc + (o.totalPactado || 0), 0);
  const totalRecaudado = metrics?.financiero.totalRecaudado || orders.reduce((acc, o) => acc + (o.totalAbonado || 0), 0);
  const carteraPendiente = metrics?.financiero.carteraPendiente || Math.max(0, totalFacturado - totalRecaudado);
  const recoveryRate = totalFacturado > 0 ? Math.min(100, Math.round((totalRecaudado / totalFacturado) * 100)) : 0;

  // Cotizaciones en trámite comercial
  const activeQuotes = useMemo(() => {
    return quotes.filter((q) => q.status === 'BORRADOR' || q.status === 'ENVIADA');
  }, [quotes]);
  const totalCotizado = activeQuotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);

  // 2. Flujo de Producción en Vivo (Etapas de Taller)
  const productionStages = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'CANCELADO');
    const stages: {
      status: OrderStatus;
      label: string;
      icon: any;
      count: number;
      amount: number;
      badgeColor: string;
      accentBg: string;
      textColor: string;
    }[] = [
      {
        status: 'CREADO',
        label: 'Aprobadas / En Espera',
        icon: FileCheck,
        count: active.filter((o) => o.status === 'CREADO').length,
        amount: active.filter((o) => o.status === 'CREADO').reduce((sum, o) => sum + (o.totalPactado || 0), 0),
        badgeColor: 'bg-[#FAF1DA] text-[#A57525] border-[#eedab1]',
        accentBg: 'bg-[#FAF1DA]/40',
        textColor: 'text-[#A57525]',
      },
      {
        status: 'FABRICACION',
        label: 'En Mesa de Orfebre',
        icon: Hammer,
        count: active.filter((o) => o.status === 'FABRICACION').length,
        amount: active.filter((o) => o.status === 'FABRICACION').reduce((sum, o) => sum + (o.totalPactado || 0), 0),
        badgeColor: 'bg-[#E5F4EE] text-[#176B52] border-[#c1e7d4]',
        accentBg: 'bg-[#E5F4EE]/40',
        textColor: 'text-[#176B52]',
      },
      {
        status: 'CALIDAD',
        label: 'Control & Acabado',
        icon: ShieldAlert,
        count: active.filter((o) => o.status === 'CALIDAD').length,
        amount: active.filter((o) => o.status === 'CALIDAD').reduce((sum, o) => sum + (o.totalPactado || 0), 0),
        badgeColor: 'bg-[#FFF4D6] text-[#9A6700] border-[#fce49f]',
        accentBg: 'bg-[#FFF4D6]/40',
        textColor: 'text-[#9A6700]',
      },
      {
        status: 'ENTREGADO',
        label: 'Entregadas / Paz y Salvo',
        icon: CheckCircle2,
        count: active.filter((o) => o.status === 'ENTREGADO').length,
        amount: active.filter((o) => o.status === 'ENTREGADO').reduce((sum, o) => sum + (o.totalPactado || 0), 0),
        badgeColor: 'bg-[#E6F5ED] text-[#17734B] border-[#c1e7d4]',
        accentBg: 'bg-[#E6F5ED]/40',
        textColor: 'text-[#17734B]',
      },
    ];
    return stages;
  }, [orders]);

  // 3. Carga de Trabajo y Metales en Custodia por Joyero
  const artisansWorkload = useMemo(() => {
    const joyeros = users.filter((u) => u.role === 'JOYERO');
    return joyeros.map((artisan) => {
      const assignedOrders = orders.filter(
        (o) => o.artisanId === artisan.id && (o.status === 'FABRICACION' || o.status === 'CALIDAD')
      );
      const enMesa = assignedOrders.filter((o) => o.status === 'FABRICACION').length;
      const enCalidad = assignedOrders.filter((o) => o.status === 'CALIDAD').length;

      // Cálculo de oro y metal entregado en custodia
      const metalEnCustodia = assignedOrders.reduce((acc, ord) => {
        const matSum = (ord.materialsUsed || []).reduce((sub, m) => {
          if (m.material?.unit === 'GRAMOS' || (m.material?.type && m.material.type !== 'PIEDRA_PRECIOSA')) {
            return sub + (Number(m.quantity) || 0);
          }
          return sub;
        }, 0);
        return acc + matSum;
      }, 0);

      let capacityStatus: { label: string; badgeClass: string } = {
        label: 'Disponible',
        badgeClass: 'bg-[#E6F5ED] text-[#17734B] border-[#c1e7d4]',
      };
      if (assignedOrders.length >= 4) {
        capacityStatus = {
          label: 'Alta Demanda',
          badgeClass: 'bg-[#FFF4D6] text-[#9A6700] border-[#fce49f]',
        };
      } else if (assignedOrders.length >= 1) {
        capacityStatus = {
          label: 'Carga Óptima',
          badgeClass: 'bg-[#E5F4EE] text-[#176B52] border-[#c1e7d4]',
        };
      }

      return {
        artisan,
        totalPiezas: assignedOrders.length,
        enMesa,
        enCalidad,
        metalEnCustodia,
        capacityStatus,
        orders: assignedOrders,
      };
    });
  }, [users, orders]);

  // 4. Semáforo SLA de Entregas Próximas y Urgentes
  const categorizedDeliveries = useMemo(() => {
    const active = orders.filter(
      (o) => o.estimatedDelivery && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const urgent: Order[] = [];
    const upcoming: Order[] = [];
    const onSchedule: Order[] = [];

    active.forEach((ord) => {
      const delivery = new Date(ord.estimatedDelivery!).getTime();
      const diffDays = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        urgent.push(ord); // Vencida o entrega hoy
      } else if (diffDays <= 3) {
        upcoming.push(ord); // Próximas 48h - 72h
      } else if (diffDays <= 7) {
        onSchedule.push(ord); // Entre 4 y 7 días
      }
    });

    // Ordenar por fecha más próxima
    const sorter = (a: Order, b: Order) =>
      new Date(a.estimatedDelivery!).getTime() - new Date(b.estimatedDelivery!).getTime();

    urgent.sort(sorter);
    upcoming.sort(sorter);
    onSchedule.sort(sorter);

    return {
      urgent,
      upcoming,
      onSchedule,
      all: [...urgent, ...upcoming, ...onSchedule],
    };
  }, [orders]);

  const displayedDeliveries = useMemo(() => {
    if (deliveryFilter === 'URGENT') return categorizedDeliveries.urgent;
    if (deliveryFilter === 'UPCOMING') return categorizedDeliveries.upcoming;
    return categorizedDeliveries.all;
  }, [categorizedDeliveries, deliveryFilter]);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          ENCABEZADO EJECUTIVO & ACCIONES RÁPIDAS
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-[#DDE3E0] shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF1DA] text-[#A57525] border border-[#eedab1] uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Alta Dirección • Taller Central Papoi</span>
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17201D] mt-1">
            Panel Principal & Control de Operaciones
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Monitor integral en tiempo real: flujo de caja, balance de orfebres, embudo de forja y semáforo de entregas.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToTab('quotes')}
            className="text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Nueva Cotización</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToTab('payments')}
            className="text-xs font-semibold"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1 text-[#176B52]" />
            <span>Caja & Abonos</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsRegisterModalOpen(true)}
            className="text-xs font-semibold shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            <span>+ Registrar Personal</span>
          </Button>

          <Button
            size="sm"
            variant="gold"
            onClick={() => onNavigateToTab('orders')}
            className="text-xs font-semibold"
          >
            <span>Ver Tablero</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* =========================================================================
          TARJETAS KPI DE ALTA DIRECCIÓN (FINANZAS & OPERACIONES)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Recaudado Real */}
        <div className="p-5 bg-white rounded-2xl border border-[#DDE3E0] shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D]">
              Recaudación en Caja
            </span>
            <div className="p-2 rounded-xl bg-[#E6F5ED] text-[#17734B]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-mono font-bold text-[#17734B]">
              {formatCurrency(totalRecaudado)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#66736D] mt-1.5">
              <span>Efectividad de Cobro:</span>
              <strong className="font-mono text-[#17734B]">{recoveryRate}%</strong>
            </div>
            {/* Barra de progreso de recaudo */}
            <div className="w-full bg-[#E6F5ED] rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-[#17734B] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${recoveryRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2. Cartera Pendiente en Calle */}
        <div className="p-5 bg-white rounded-2xl border border-[#DDE3E0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D]">
              Cartera Pendiente
            </span>
            <div className="p-2 rounded-xl bg-[#FFF4D6] text-[#9A6700]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-mono font-bold text-[#9A6700]">
              {formatCurrency(carteraPendiente)}
            </p>
            <p className="text-[11px] text-[#66736D] mt-1.5">
              Exigible al formalizar la entrega de piezas
            </p>
          </div>
        </div>

        {/* 3. Cotizaciones en Negociación */}
        <div
          onClick={() => onNavigateToTab('quotes')}
          className="p-5 bg-white rounded-2xl border border-[#DDE3E0] shadow-xs space-y-3 cursor-pointer hover:border-[#176B52] transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] group-hover:text-[#176B52]">
              Cotizaciones Activas
            </span>
            <div className="p-2 rounded-xl bg-[#FAF1DA] text-[#A57525]">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-mono font-bold text-[#17201D]">
                {activeQuotes.length}
              </p>
              <span className="text-xs text-[#66736D]">propuestas</span>
            </div>
            <p className="text-[11px] font-mono text-[#A57525] font-semibold mt-1.5">
              {formatCurrency(totalCotizado)} valor comercial
            </p>
          </div>
        </div>

        {/* 4. Alerta de Bóveda & Stock Crítico */}
        <div
          onClick={() => onNavigateToTab('inventory')}
          className="p-5 bg-[#FAF1DA] rounded-2xl border border-[#eedab1] shadow-xs space-y-3 cursor-pointer hover:border-[#A57525] transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A57525]">
              Stock Crítico en Bóveda
            </span>
            <div className="p-2 rounded-xl bg-[#FFF4D6] text-[#9A6700]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-mono font-bold text-[#A57525]">
                {metrics?.inventario.materialesCriticosCount || 0}
              </p>
              <span className="text-xs text-[#A57525] font-medium">metales o gemas</span>
            </div>
            <p className="text-[11px] text-[#A57525] font-semibold mt-1.5 flex items-center space-x-1">
              <span>Bajo el stock mínimo de reserva</span>
              <ChevronRight className="w-3.5 h-3.5 inline" />
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FLUJO DE PRODUCCIÓN EN VIVO (ETAPAS DE TALLER)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDE3E0] pb-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-[#176B52]" />
            <div>
              <h3 className="font-serif font-bold text-base text-[#17201D]">
                Flujo de Producción en Vivo
              </h3>
              <p className="text-xs text-[#66736D]">
                Estado de las piezas según su avance técnico y volumen financiero asociado.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToTab('orders')}
            className="text-xs self-start sm:self-auto"
          >
            <span>Ver Tablero Kanban</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {/* Grid de Etapas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {productionStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.status}
                onClick={() => onNavigateToTab('orders')}
                className={`p-4 rounded-xl border border-[#DDE3E0] ${stage.accentBg} hover:border-[#17201D] transition cursor-pointer flex flex-col justify-between space-y-3 group`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${stage.badgeColor}`}>
                    {stage.label}
                  </span>
                  <div className={`p-1.5 rounded-lg bg-white border border-[#DDE3E0] ${stage.textColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-mono font-bold text-[#17201D]">
                      {stage.count}
                    </span>
                    <span className="text-xs text-[#66736D]">piezas</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#66736D] block mt-1">
                    {formatCurrency(stage.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN DOBLE: CARGA DE TRABAJO POR JOYERO & SEMÁFORO SLA
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. CARGA DE TRABAJO Y CUSTODIA POR ORFBRE */}
        <div className="bg-white rounded-2xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDE3E0] pb-3">
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-[#A57525]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[#17201D]">
                  Carga de Trabajo & Custodia de Metal
                </h3>
                <p className="text-xs text-[#66736D]">
                  Distribución de piezas en banco y oro entregado por cada orfebre.
                </p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FAF1DA] text-[#A57525] font-bold border border-[#eedab1]">
              {artisansWorkload.length} orfebres
            </span>
          </div>

          <div className="space-y-3">
            {artisansWorkload.map((item) => (
              <div
                key={item.artisan.id}
                className="p-3.5 rounded-xl border border-[#DDE3E0] bg-[#F4F6F8] hover:border-[#176B52] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[#17211D] text-[#EDF5F2] flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                    {item.artisan.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-bold text-[#17201D]">
                        {item.artisan.fullName}
                      </p>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${item.capacityStatus.badgeClass}`}>
                        {item.capacityStatus.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#66736D] mt-0.5">
                      {item.enMesa} en mesa forja • {item.enCalidad} en pulido/calidad
                    </p>
                  </div>
                </div>

                <div className="sm:text-right flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 pt-2 sm:pt-0 border-[#DDE3E0]">
                  <span className="text-[10px] font-bold uppercase text-[#66736D]">
                    Oro en Custodia
                  </span>
                  <span className="font-mono text-xs font-bold text-[#17734B]">
                    {formatGrams(item.metalEnCustodia)} netos
                  </span>
                </div>
              </div>
            ))}

            {artisansWorkload.length === 0 && (
              <div className="py-8 text-center text-xs text-[#9CA9A3]">
                No hay joyeros u orfebres registrados en el sistema.
              </div>
            )}
          </div>
        </div>

        {/* 2. SEMÁFORO Y MONITOR DE ENTREGAS SLA */}
        <div className="bg-white rounded-2xl border border-[#DDE3E0] p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDE3E0] pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#176B52]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[#17201D]">
                  Semáforo de Entregas & SLA
                </h3>
                <p className="text-xs text-[#66736D]">
                  Seguimiento de plazos pactados con clientes para blindar la reputación de tienda.
                </p>
              </div>
            </div>

            {/* Píldoras de filtro */}
            <div className="flex items-center space-x-1 self-start sm:self-auto text-[11px]">
              <button
                type="button"
                onClick={() => setDeliveryFilter('ALL')}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  deliveryFilter === 'ALL'
                    ? 'bg-[#17211D] text-white'
                    : 'bg-[#F4F6F8] text-[#66736D] hover:bg-[#DDE3E0]'
                }`}
              >
                Todas ({categorizedDeliveries.all.length})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter('URGENT')}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  deliveryFilter === 'URGENT'
                    ? 'bg-[#B42318] text-white'
                    : 'bg-[#FEE4E2] text-[#B42318] hover:bg-[#FECDCA]'
                }`}
              >
                Urgentes ({categorizedDeliveries.urgent.length})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryFilter('UPCOMING')}
                className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                  deliveryFilter === 'UPCOMING'
                    ? 'bg-[#9A6700] text-white'
                    : 'bg-[#FFF4D6] text-[#9A6700] hover:bg-[#fae3ad]'
                }`}
              >
                Próximas ({categorizedDeliveries.upcoming.length})
              </button>
            </div>
          </div>

          {/* Lista de Joyas */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {displayedDeliveries.map((ord) => {
              const sla = getDeliverySLA(ord.estimatedDelivery);
              return (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(ord)}
                  className="p-3.5 rounded-xl border border-[#DDE3E0] bg-[#F4F6F8] hover:border-[#176B52] hover:bg-white transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono text-[10px] font-bold text-[#A57525]">
                        #{ord.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-[#17201D] truncate group-hover:text-[#176B52]">
                        {ord.client?.fullName || 'Cliente'}
                      </span>
                    </div>
                    <p className="text-xs text-[#66736D] truncate">
                      {ord.description || 'Joya personalizada'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1 text-[10px] text-[#66736D]">
                      <span>Orfebre: <strong className="text-[#17201D]">{ord.artisan?.fullName || 'Sin asignar'}</strong></span>
                      <span>•</span>
                      <span>Fase: <strong className="text-[#176B52]">{ord.status}</strong></span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border block mb-1 ${sla.badgeClass}`}>
                      {sla.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#17201D] block">
                      {formatCurrency(ord.totalPactado)}
                    </span>
                  </div>
                </div>
              );
            })}

            {displayedDeliveries.length === 0 && (
              <div className="py-8 text-center text-xs text-[#9CA9A3] flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 mb-1 text-[#17734B]" />
                <span>No hay entregas pendientes en esta categoría de filtro.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECCIÓN INFERIOR: EQUIPO DE TRABAJO AUTORIZADO & STOCK DE BÓVEDA
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertas de Materiales en Bóveda */}
        <div className="bg-white rounded-2xl border border-[#DDE3E0] p-5 shadow-xs space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-[#DDE3E0] pb-3">
            <div className="flex items-center space-x-2">
              <Boxes className="w-5 h-5 text-[#A57525]" />
              <h3 className="font-serif font-bold text-base text-[#17201D]">
                Materiales Críticos
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('inventory')}
              className="text-xs"
            >
              Bodega
            </Button>
          </div>

          <div className="space-y-3">
            {(metrics?.inventario.alertasStock || []).map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl border border-[#fce49f] bg-[#FFF4D6]/30 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-[#17201D]">
                    {alert.nombre}
                  </h4>
                  <p className="text-[10px] text-[#66736D] mt-0.5">
                    Mínimo: {formatGrams(alert.stockMinimo, alert.unidad)}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="font-mono text-xs font-bold text-[#9A6700] block">
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
                    className="mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#FAF1DA] text-[#A57525] border border-[#eedab1] hover:bg-[#A57525] hover:text-white transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Reabastecer</span>
                  </button>
                </div>
              </div>
            ))}

            {(!metrics?.inventario.alertasStock || metrics.inventario.alertasStock.length === 0) && (
              <div className="py-6 text-center text-xs text-[#17734B] flex flex-col items-center">
                <CheckCircle2 className="w-5 h-5 mb-1 text-[#17734B]" />
                <span>Bóveda con stock seguro.</span>
              </div>
            )}
          </div>
        </div>

        {/* Equipo y Personal Autorizado */}
        <div className="bg-white rounded-2xl border border-[#DDE3E0] p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#DDE3E0] pb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-[#176B52]" />
              <div>
                <h3 className="font-serif font-bold text-base text-[#17201D]">
                  Equipo & Personal de Joyería Autorizado
                </h3>
                <p className="text-xs text-[#66736D]">
                  {users.length} colaboradores activos con credenciales en Papoi ERP.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRegisterModalOpen(true)}
              className="text-xs border-[#176B52] text-[#176B52] hover:bg-[#E5F4EE]"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              <span>+ Nuevo Personal</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-xl border border-[#DDE3E0] bg-[#F4F6F8] hover:border-[#176B52] transition flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-[#176B52] text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                    {u.fullName.charAt(0)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-[#17201D] truncate">{u.fullName}</p>
                    <p className="text-[10px] text-[#66736D] truncate">{u.email}</p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border flex-shrink-0 ml-2 ${
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
