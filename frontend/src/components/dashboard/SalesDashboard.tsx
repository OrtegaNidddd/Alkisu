import React from 'react';
import { useOrders, useQuotes, useClients } from '../../api/hooks';
import { formatCurrency, formatDate, getDeliverySLA } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  UserCheck,
  FileText,
  Gift,
  CreditCard,
  Phone,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Order } from '../../types';

interface SalesDashboardProps {
  onNavigateToTab: (tabId: string) => void;
  onSelectOrder: (order: Order) => void;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  onNavigateToTab,
  onSelectOrder,
}) => {
  const { data: orders = [] } = useOrders();
  const { data: quotes = [] } = useQuotes();
  const { data: clients = [] } = useClients();

  // Joyas en estado CALIDAD o listas para entregar a cliente
  const readyForPickupOrders = orders.filter(
    (o) => o.status === 'CALIDAD' || (o.status !== 'ENTREGADO' && o.status !== 'CANCELADO' && o.saldoPendiente === 0)
  );

  // Cotizaciones en borrador o enviadas
  const pendingQuotes = quotes.filter((q) => q.status === 'BORRADOR' || q.status === 'ENVIADA');

  // Cálculos de recaudación comercial
  const totalCotizado = pendingQuotes.reduce((acc, q) => acc + q.totalAmount, 0);
  const totalCartera = orders
    .filter((o) => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO')
    .reduce((acc, o) => acc + (o.saldoPendiente || 0), 0);
  const totalAbonado = orders.reduce((acc, o) => acc + (o.totalAbonado || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF1FC] text-[#2457A6] border border-[#c6daf7] uppercase tracking-wider">
              Área Comercial & Vitrina
            </span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17201D] mt-1">
            Panel de Ventas & Atención a Clientes
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Gestión de cotizaciones en tiempo real, abonos en caja y seguimiento de entregas a clientes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigateToTab('quotes')}
            className="shadow-sm"
          >
            <span>+ Nueva Cotización</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToTab('payments')}
          >
            <CreditCard className="w-4 h-4 mr-1.5" />
            <span>Caja & Abonos</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI Comerciales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#DDE3E0] shadow-2xs hover:border-[#176B52] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D]">
              Cotizaciones Activas
            </span>
            <div className="p-2 rounded-lg bg-[#FAF1DA] text-[#A57525]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#17201D]">{pendingQuotes.length}</span>
            <span className="text-xs text-[#66736D] ml-2">propuestas</span>
          </div>
          <p className="text-xs text-[#A57525] font-semibold mt-1">
            {formatCurrency(totalCotizado)} valor estimado
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DDE3E0] shadow-2xs hover:border-[#176B52] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D]">
              Joyas para Entrega
            </span>
            <div className="p-2 rounded-lg bg-[#E6F5ED] text-[#17734B]">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#17734B]">
              {readyForPickupOrders.length}
            </span>
            <span className="text-xs text-[#66736D] ml-2">listas para entregar</span>
          </div>
          <p className="text-xs text-[#66736D] mt-1">
            En control de calidad o listas en vitrina
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DDE3E0] shadow-2xs hover:border-[#176B52] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D]">
              Cartera por Cobrar
            </span>
            <div className="p-2 rounded-lg bg-[#FFF4D6] text-[#9A6700]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#9A6700]">
              {formatCurrency(totalCartera)}
            </span>
          </div>
          <p className="text-xs text-[#66736D] mt-1">Saldos pendientes al entregar</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#DDE3E0] shadow-2xs hover:border-[#176B52] transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66736D]">
              Total Recaudado Caja
            </span>
            <div className="p-2 rounded-lg bg-[#E5F4EE] text-[#176B52]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#176B52]">
              {formatCurrency(totalAbonado)}
            </span>
          </div>
          <p className="text-xs text-[#17734B] font-medium mt-1">Anticipos y liquidaciones</p>
        </div>
      </div>

      {/* Grid Principal: Joyas Listas y Cotizaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Joyas Listas para Entrega a Clientes (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-[#DDE3E0] overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-[#DDE3E0] flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#17201D]">
                  Joyas Listas para Contactar & Entregar al Cliente
                </h3>
                <p className="text-xs text-[#66736D]">
                  Piezas terminadas en taller que requieren aviso o entrega en vitrina comercial.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateToTab('orders')}
              >
                <span>Ver Todas</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {readyForPickupOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#66736D]">
                <CheckCircle2 className="w-8 h-8 text-[#176B52] mx-auto mb-2" />
                No hay joyas pendientes de entrega en este momento.
              </div>
            ) : (
              <div className="divide-y divide-[#DDE3E0]">
                {readyForPickupOrders.slice(0, 5).map((order) => {
                  const client = clients.find((c) => c.id === order.clientId);
                  return (
                    <div
                      key={order.id}
                      className="p-4 hover:bg-[#F4F6F8] transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[#E5F4EE] border border-[#DDE3E0] flex items-center justify-center flex-shrink-0">
                          <Gift className="w-5 h-5 text-[#176B52]" />
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
                            <span className="font-medium text-[#17201D]">
                              Cliente: {order.client?.fullName || 'Cliente General'}
                            </span>
                            {client?.phone && (
                              <span className="flex items-center space-x-1 text-[#2457A6]">
                                <Phone className="w-3 h-3" />
                                <span>{client.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-4">
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#17201D]">
                            {formatCurrency(order.totalPactado)}
                          </p>
                          <p
                            className={`text-[11px] font-semibold ${
                              (order.saldoPendiente ?? 0) > 0 ? 'text-[#B42318]' : 'text-[#17734B]'
                            }`}
                          >
                            {(order.saldoPendiente ?? 0) > 0
                              ? `Saldo: ${formatCurrency(order.saldoPendiente ?? 0)}`
                              : 'Totalmente Pagado'}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="gold"
                          onClick={() => onSelectOrder(order)}
                        >
                          Ver Ficha
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Directorio Rápido de Clientes en Vitrina */}
          <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#17201D]">
                  Atención Rápida a Clientes
                </h3>
                <p className="text-xs text-[#66736D]">
                  Directorio comercial para iniciar pedidos o enviar comprobantes de abono.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onNavigateToTab('clients')}
              >
                <span>Ver Clientes</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clients.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-[#DDE3E0] bg-[#F4F6F8] hover:border-[#176B52] transition flex items-center justify-between"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-[#17201D] truncate">{c.fullName}</p>
                    <p className="text-[11px] text-[#66736D] truncate">{c.phone}</p>
                  </div>
                  <button
                    onClick={() => onNavigateToTab('quotes')}
                    className="p-1.5 rounded-md bg-white border border-[#DDE3E0] hover:border-[#176B52] text-[#176B52] text-xs font-semibold"
                    title="Crear Cotización"
                  >
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Cotizaciones Recientes & Acciones */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#DDE3E0] p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#17201D]">
                  Cotizaciones Pendientes
                </h3>
                <p className="text-xs text-[#66736D]">Propuestas pendientes de confirmación.</p>
              </div>
              <Badge variant="warning">{pendingQuotes.length}</Badge>
            </div>

            <div className="space-y-3">
              {pendingQuotes.slice(0, 4).map((quote) => (
                <div
                  key={quote.id}
                  className="p-3 rounded-lg border border-[#DDE3E0] hover:border-[#A57525] transition bg-white"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-[#A57525]">
                      #{quote.id}
                    </span>
                    <span className="text-xs font-bold text-[#17201D]">
                      {formatCurrency(quote.totalAmount)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#17201D] truncate">
                    {quote.items?.[0]?.description || 'Propuesta de Joyería'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-[#66736D] mt-2 pt-2 border-t border-[#EEF1F0]">
                    <span>Vence: {formatDate(quote.validUntil)}</span>
                    <button
                      onClick={() => onNavigateToTab('quotes')}
                      className="text-[#176B52] font-semibold hover:underline"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full mt-4"
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('quotes')}
            >
              <span>Ir al Cotizador</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {/* Banner de Ayuda Comercial */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#17211D] to-[#22332C] text-[#EDF5F2] border border-[#2D3F38]">
            <div className="flex items-center space-x-2 text-[#A57525] mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">
                Políticas de Vitrina
              </span>
            </div>
            <p className="text-xs text-[#9CA9A3] leading-relaxed">
              Recuerda solicitar el <strong>50% de anticipo</strong> para enviar el pedido a fundición en el taller. Los precios de metales finos se actualizan según cotización diaria.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
