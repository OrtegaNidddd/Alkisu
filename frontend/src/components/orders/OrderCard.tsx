import React from 'react';
import { Order } from '../../types';
import { formatCurrency, getDeliverySLA } from '../../utils/formatters';
import { User, AlertCircle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface OrderCardProps {
  order: Order;
  onClick: () => void;
  onAdvanceStatus?: (order: Order) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, onAdvanceStatus }) => {
  const sla = getDeliverySLA(order.estimatedDelivery);
  const primaryAttachment = order.attachments?.[0];
  const hasPendingBalance = (order.saldoPendiente ?? 0) > 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-[#DDE3E0] rounded-xl p-4 shadow-xs hover:shadow-md hover:border-[#176B52] transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        {/* Encabezado de la tarjeta con imagen y estado SLA */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-[#F4F6F8] border border-[#DDE3E0] overflow-hidden flex-shrink-0 flex items-center justify-center">
              {primaryAttachment?.fileUrl ? (
                <img
                  src={primaryAttachment.fileUrl}
                  alt={order.description}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="text-[10px] text-[#9CA9A3] uppercase font-bold text-center px-1">
                  Boceto Pendiente
                </div>
              )}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#A57525] uppercase tracking-wider">
                #{order.id.toUpperCase()}
              </span>
              <h4 className="text-xs font-bold text-[#17201D] line-clamp-1 group-hover:text-[#176B52] transition-colors">
                {order.client?.fullName}
              </h4>
            </div>
          </div>

          {/* Semáforo de Entrega SLA */}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center space-x-1 ${sla.badgeClass}`}
            title={`Fecha estimada: ${order.estimatedDelivery || 'No pactada'}`}
          >
            <Clock className="w-3 h-3" />
            <span>{sla.label}</span>
          </span>
        </div>

        {/* Descripción de la Joya */}
        <p className="text-xs text-[#66736D] line-clamp-2 mb-3 leading-relaxed">
          {order.description}
        </p>

        {/* Joyero Asignado */}
        <div className="flex items-center space-x-2 py-1.5 px-2.5 rounded-lg bg-[#F4F6F8] mb-3 text-xs text-[#17201D]">
          <User className="w-3.5 h-3.5 text-[#176B52]" />
          <span className="text-[#66736D] text-[11px]">Orfebre:</span>
          <span className="font-medium truncate">
            {order.artisan?.fullName || 'Sin joyero asignado'}
          </span>
        </div>
      </div>

      {/* Pie Financiero y Alerta de Saldo */}
      <div className="pt-2 border-t border-[#DDE3E0]">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[#66736D]">Pactado:</span>
          <span className="font-semibold text-[#17201D]">
            {formatCurrency(order.totalPactado)}
          </span>
        </div>

        {hasPendingBalance ? (
          <div className="flex items-center justify-between text-[11px] bg-[#FFF4D6] text-[#9A6700] px-2 py-1 rounded border border-[#fce49f]">
            <div className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-[#9A6700] flex-shrink-0" />
              <span>Saldo por cobrar:</span>
            </div>
            <span className="font-bold">{formatCurrency(order.saldoPendiente)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] bg-[#E6F5ED] text-[#17734B] px-2 py-1 rounded border border-[#c1e7d4]">
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-[#17734B]" />
              <span>100% Cancelado</span>
            </div>
            <span className="font-semibold">Listo para entrega</span>
          </div>
        )}
      </div>
    </div>
  );
};
