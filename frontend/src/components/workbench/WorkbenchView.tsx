import React, { useState } from 'react';
import { Order, OrderAttachment } from '../../types';
import { formatGrams, formatDate, getDeliverySLA } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Lightbox } from '../ui/Lightbox';
import { MetalReturnModal } from './MetalReturnModal';
import {
  Hammer,
  Scale,
  ZoomIn,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { useUpdateOrderStatus } from '../../api/hooks';
import { useAuth } from '../../hooks/useAuth';

interface WorkbenchViewProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  orders,
  onSelectOrder,
}) => {
  const [selectedOrderForMetal, setSelectedOrderForMetal] = useState<Order | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<OrderAttachment | null>(null);

  const { user, role } = useAuth();
  const updateStatusMutation = useUpdateOrderStatus();

  // Piezas asignadas activas (en fabricación o calidad)
  const workbenchOrders = orders.filter(
    (o) => (o.status === 'FABRICACION' || o.status === 'CALIDAD') && (role === 'ADMIN' || o.artisanId === user?.id)
  );

  const handleAdvanceToQuality = async (order: Order) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        newStatus: 'CALIDAD',
        note: 'Pieza terminada por el maestro joyero y colocada en inspección óptica',
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del Banco de Trabajo con ergonomía de taller */}
      <div className="p-6 bg-[#17211D] text-[#EDF5F2] rounded-2xl border border-[#22332C] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#176B52] to-[#125541] flex items-center justify-center border border-[#3E564C] shadow-inner">
            <Hammer className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif text-xl font-bold tracking-wide">
                Mi Mesa de Trabajo
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#FAF1DA] text-[#A57525] border border-[#eedab1]">
                Entorno Taller
              </span>
            </div>
            <p className="text-xs text-[#9CA9A3] mt-1">
              Foco en especificaciones técnicas, zoom de bocetos y balance de balanza de precisión.
            </p>
          </div>
        </div>

        {/* Resumen rápido de piezas en banco */}
        <div className="flex items-center space-x-3 bg-[#22332C] px-4 py-3 rounded-xl border border-[#3E564C]">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-[#9CA9A3] block">
              Piezas en Mano
            </span>
            <span className="text-lg font-bold text-white font-mono">
              {workbenchOrders.length} activas
            </span>
          </div>
          <div className="w-px h-8 bg-[#3E564C]" />
          <div className="p-2 bg-[#176B52]/40 rounded-lg text-[#E5F4EE]">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Lista de Joyas Asignadas */}
      <div className="space-y-4">
        {workbenchOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-[#DDE3E0] space-y-3">
            <CheckCircle className="w-12 h-12 text-[#17734B] mx-auto opacity-60" />
            <h4 className="text-base font-bold text-[#17201D] font-serif">
              Mesa de Trabajo Despejada
            </h4>
            <p className="text-xs text-[#66736D] max-w-md mx-auto">
              No tienes órdenes pendientes asignadas en este momento. Cuando administración o asesoría asigne una joya, aparecerá aquí automáticamente.
            </p>
          </div>
        ) : (
          workbenchOrders.map((order) => {
            const sla = getDeliverySLA(order.estimatedDelivery);
            const mainPhoto = order.attachments?.[0];
            const metalTotal = order.materialsUsed?.reduce((acc, m) => acc + Number(m.quantity), 0) || 11.5;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#DDE3E0] p-6 shadow-xs hover:border-[#176B52] transition-all space-y-5"
              >
                {/* Cabecera de la Pieza */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DDE3E0]">
                  <div className="flex items-start space-x-4">
                    {/* Miniatura con botón de lupa rápida */}
                    <div
                      onClick={() => mainPhoto && setActiveLightboxImage(mainPhoto)}
                      className="relative w-20 h-20 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0] overflow-hidden flex-shrink-0 cursor-pointer group shadow-inner"
                      title="Clic para zoom macro"
                    >
                      {mainPhoto ? (
                        <>
                          <img
                            src={mainPhoto.fileUrl}
                            alt={order.description}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <ZoomIn className="w-6 h-6" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-[#9CA9A3] text-center p-1">
                          Sin Foto
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-[#A57525] bg-[#FAF1DA] px-2.5 py-0.5 rounded">
                          #{order.id.toUpperCase()}
                        </span>
                        <Badge
                          variant={order.status === 'CALIDAD' ? 'info' : 'gold'}
                          size="sm"
                        >
                          {order.status === 'CALIDAD' ? 'En Control de Calidad' : 'En Banco de Trabajo'}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-[#17201D] mt-1 font-serif">
                        {order.description}
                      </h3>
                      <p className="text-xs text-[#66736D] mt-0.5">
                        Cliente: <strong>{order.client?.fullName}</strong>
                      </p>
                    </div>
                  </div>

                  {/* SLA de Entrega */}
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-3 py-1.5 rounded-full border flex items-center space-x-1.5 ${sla.badgeClass}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{sla.label}</span>
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectOrder(order)}
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Ficha Completa
                    </Button>
                  </div>
                </div>

                {/* Especificaciones de Materia Prima y Metales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#F4F6F8] p-4 rounded-xl border border-[#DDE3E0]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#66736D] block">
                      Metal Entregado para la Pieza
                    </span>
                    <span className="font-mono text-base font-bold text-[#17201D]">
                      {formatGrams(metalTotal)}
                    </span>
                    <p className="text-[11px] text-[#66736D] mt-0.5">
                      {order.materialsUsed?.[0]?.material?.name || 'Oro 18k'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#66736D] block">
                      Gemas y Elementos Centrales
                    </span>
                    <span className="text-xs font-semibold text-[#17201D] block mt-0.5">
                      {order.materialsUsed?.find((m) => m.material?.type === 'PIEDRA_PRECIOSA')?.material?.name || 'Sin gemas registradas'}
                    </span>
                    <p className="text-[11px] text-[#66736D]">
                      {order.materialsUsed?.find((m) => m.material?.type === 'PIEDRA_PRECIOSA')
                        ? `${order.materialsUsed.find((m) => m.material?.type === 'PIEDRA_PRECIOSA')?.quantity} ct`
                        : 'Engaste liso'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#66736D] block">
                      Tolerancia Técnica de Merma
                    </span>
                    <span className="font-mono text-base font-bold text-[#A57525]">
                      ≤ 8.00 %
                    </span>
                    <p className="text-[11px] text-[#9CA9A3] mt-0.5">
                      Alerta ámbar requerirá justificación
                    </p>
                  </div>
                </div>

                {/* BOTONES GRANDES ERGONÓMICOS PARA EL JOYERO */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex space-x-2">
                    {mainPhoto && (
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => setActiveLightboxImage(mainPhoto)}
                      >
                        <ZoomIn className="w-4 h-4 mr-2 text-[#176B52]" />
                        Inspeccionar Boceto en Alta Definición
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Botón de Liquidación de Metal */}
                    <Button
                      variant="gold"
                      size="workbench"
                      onClick={() => setSelectedOrderForMetal(order)}
                    >
                      <Scale className="w-5 h-5 mr-2" />
                      Liquidar Metal & Merma
                    </Button>

                    {/* Botón avanzar a Calidad */}
                    {order.status === 'FABRICACION' && (
                      <Button
                        variant="joyero"
                        size="workbench"
                        onClick={() => handleAdvanceToQuality(order)}
                        isLoading={updateStatusMutation.isPending}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Pasar a Control Calidad
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Liquidación de Metal con balanza 0.001g */}
      <MetalReturnModal
        order={selectedOrderForMetal}
        isOpen={!!selectedOrderForMetal}
        onClose={() => setSelectedOrderForMetal(null)}
      />

      {/* Lightbox con Zoom */}
      <Lightbox
        isOpen={!!activeLightboxImage}
        onClose={() => setActiveLightboxImage(null)}
        imageUrl={activeLightboxImage?.fileUrl || ''}
        title={activeLightboxImage?.fileName}
        description={activeLightboxImage?.description || undefined}
      />
    </div>
  );
};
