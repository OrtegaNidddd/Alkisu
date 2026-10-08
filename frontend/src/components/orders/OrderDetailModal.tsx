import React, { useState } from 'react';
import {
  Order,
  OrderStatus,
  OrderAttachment,
  PaymentMethod,
  AttachmentType,
} from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Lightbox } from '../ui/Lightbox';
import {
  formatCurrency,
  formatGrams,
  formatDate,
  getDeliverySLA,
} from '../../utils/formatters';
import {
  User,
  Calendar,
  DollarSign,
  Layers,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  History,
  FileCheck,
  Upload,
  Printer,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  XCircle,
} from 'lucide-react';
import {
  useUpdateOrderStatus,
  useAddPayment,
  useCancelOrder,
  useAddAttachment,
} from '../../api/hooks';
import { useAuth } from '../../hooks/useAuth';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMetalReturn?: (order: Order) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onOpenMetalReturn,
}) => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'general' | 'gallery' | 'materials' | 'metal' | 'payments' | 'history'
  >('general');

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<OrderAttachment | null>(null);

  // Abonos
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Cancelación
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Errores locales (ej. bloqueo de entrega)
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Recibo de comprobante imprimible
  const [receiptPayment, setReceiptPayment] = useState<any | null>(null);

  // Mutaciones
  const updateStatusMutation = useUpdateOrderStatus();
  const addPaymentMutation = useAddPayment();
  const cancelOrderMutation = useCancelOrder();
  const addAttachmentMutation = useAddAttachment();

  if (!order) return null;

  const sla = getDeliverySLA(order.estimatedDelivery);
  const totalAbonado = order.totalAbonado ?? (order.payments?.reduce((acc, p) => acc + p.amount, 0) || 0);
  const saldoPendiente = Math.max(0, order.totalPactado - totalAbonado);
  const isPaidInFull = saldoPendiente <= 0;

  // Manejo de cambio de estado
  const handleTransition = async (nextStatus: OrderStatus) => {
    setActionError(null);
    setActionSuccess(null);

    if (nextStatus === 'ENTREGADO' && !isPaidInFull) {
      setActionError(
        `Bloqueo de Entrega: Esta joya tiene un saldo pendiente de ${formatCurrency(
          saldoPendiente
        )}. Debe estar 100% cancelada para formalizar la entrega.`
      );
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: order.id,
        newStatus: nextStatus,
        note: `Estado actualizado a ${nextStatus} desde la ficha técnica`,
      });
      setActionSuccess(`Estado actualizado con éxito a ${nextStatus}`);
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar el estado del pedido');
    }
  };

  // Manejo de abono
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Ingrese un monto válido');
      return;
    }

    if (amountNum > saldoPendiente) {
      setActionError(`El abono (${formatCurrency(amountNum)}) excede el saldo pendiente (${formatCurrency(saldoPendiente)})`);
      return;
    }

    try {
      const res = await addPaymentMutation.mutateAsync({
        orderId: order.id,
        amount: amountNum,
        paymentMethod,
        referenceNotes: paymentNotes,
      });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      // Abrir recibo automático
      setReceiptPayment({
        amount: amountNum,
        paymentMethod,
        referenceNotes: paymentNotes,
        date: new Date().toISOString(),
        orderId: order.id,
        client: order.client,
      });
    } catch (err: any) {
      setActionError(err.message || 'Error al registrar el pago');
    }
  };

  // Subida simulada / drag & drop
  const handleMockUpload = (type: AttachmentType) => {
    const urls: Record<AttachmentType, string> = {
      BOCETO_REFERENCIA: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=80',
      RENDER_3D: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80',
      CONTROL_CALIDAD: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1200&q=80',
      CERTIFICADO: 'https://images.unsplash.com/photo-1611591475152-478311382490?auto=format&fit=crop&w=1200&q=80',
    };

    addAttachmentMutation.mutate({
      orderId: order.id,
      file: {
        fileName: `inspeccion_${type.toLowerCase()}_${Date.now().toString().slice(-4)}.jpg`,
        fileUrl: urls[type],
        fileType: type,
        description: 'Fotografía técnica cargada al expediente del taller',
      },
    });
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setActionError('Debe ingresar un motivo para cancelar');
      return;
    }
    try {
      await cancelOrderMutation.mutateAsync({
        orderId: order.id,
        reason: cancelReason,
      });
      setIsCancelConfirmOpen(false);
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Error al cancelar la orden');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="4xl"
        title={
          <div className="flex items-center space-x-3">
            <span className="font-mono text-sm px-2.5 py-1 rounded bg-[#17211D] text-[#EDF5F2] font-bold">
              #{order.id.toUpperCase()}
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#17201D]">
                Ficha Técnica de Joya
              </h3>
              <p className="text-xs text-[#66736D]">
                Cliente: <strong className="text-[#17201D]">{order.client?.fullName}</strong>
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Mensajes de Alerta / Error */}
          {actionError && (
            <div className="p-3.5 bg-[#FDECEA] border border-[#f9c5c0] rounded-xl flex items-start space-x-3 text-xs text-[#B42318] animate-in fade-in">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{actionError}</div>
              <button
                onClick={() => setActionError(null)}
                className="text-[#B42318] hover:opacity-75 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3.5 bg-[#E6F5ED] border border-[#c1e7d4] rounded-xl flex items-start space-x-3 text-xs text-[#17734B] animate-in fade-in">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{actionSuccess}</div>
            </div>
          )}

          {/* Banner de Estado & SLA */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0]">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-[#66736D] uppercase font-bold tracking-wider">
                Fase de Taller:
              </span>
              <Badge
                variant={
                  order.status === 'ENTREGADO'
                    ? 'success'
                    : order.status === 'CALIDAD'
                    ? 'info'
                    : order.status === 'FABRICACION'
                    ? 'gold'
                    : 'neutral'
                }
                size="md"
              >
                {order.status}
              </Badge>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#66736D]">Entrega:</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${sla.badgeClass}`}>
                {formatDate(order.estimatedDelivery)} ({sla.label})
              </span>
            </div>

            {/* Acciones de transición de estado */}
            <div className="flex items-center space-x-2">
              {order.status === 'CREADO' && (
                <Button
                  size="sm"
                  variant="gold"
                  onClick={() => handleTransition('FABRICACION')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Pasar a Banco (Fabricación)
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}

              {order.status === 'FABRICACION' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleTransition('CALIDAD')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Finalizar & Control Calidad
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}

              {order.status === 'CALIDAD' && (
                <Button
                  size="sm"
                  variant={isPaidInFull ? 'primary' : 'outline'}
                  onClick={() => handleTransition('ENTREGADO')}
                  isLoading={updateStatusMutation.isPending}
                  className={!isPaidInFull ? 'border-[#B42318] text-[#B42318] hover:bg-[#FDECEA]' : ''}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Formalizar Entrega al Cliente
                </Button>
              )}
            </div>
          </div>

          {/* Pestañas de Navegación de la Ficha */}
          <div className="flex border-b border-[#DDE3E0] overflow-x-auto space-x-1">
            {[
              { id: 'general', label: '1. General' },
              { id: 'gallery', label: `2. Galería (${order.attachments?.length || 0})` },
              { id: 'materials', label: `3. Materia Prima (${order.materialsUsed?.length || 0})` },
              { id: 'metal', label: '4. Cierre Metalúrgico' },
              { id: 'payments', label: `5. Caja y Abonos (${order.payments?.length || 0})` },
              { id: 'history', label: '6. Historial de Estados' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-[#176B52] text-[#176B52] bg-[#E5F4EE]/40'
                    : 'border-transparent text-[#66736D] hover:text-[#17201D] hover:border-[#DDE3E0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA9A3] mb-2">
                  Descripción Técnica de la Pieza
                </h4>
                <div className="p-4 rounded-xl bg-white border border-[#DDE3E0] text-sm text-[#17201D] leading-relaxed font-serif">
                  {order.description}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block mb-1">
                    Cliente & Contacto
                  </span>
                  <p className="text-sm font-bold text-[#17201D]">{order.client?.fullName}</p>
                  <p className="text-xs text-[#66736D] mt-0.5">{order.client?.phone}</p>
                  <p className="text-xs text-[#66736D]">{order.client?.email || 'Sin correo'}</p>
                  {order.client?.documentId && (
                    <span className="inline-block text-[10px] mt-2 font-mono bg-white px-2 py-0.5 rounded border border-[#DDE3E0]">
                      {order.client.documentId}
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block mb-1">
                    Orfebre Asignado
                  </span>
                  <p className="text-sm font-bold text-[#17201D]">
                    {order.artisan?.fullName || 'Pendiente de asignar'}
                  </p>
                  <p className="text-xs text-[#66736D] mt-0.5">
                    Banco de Trabajo: Taller Central Alkisu
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block mb-1">
                    Resumen Financiero
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#66736D]">Total Pactado:</span>
                      <strong className="text-[#17201D]">{formatCurrency(order.totalPactado)}</strong>
                    </div>
                    <div className="flex justify-between text-[#17734B]">
                      <span>Abonado:</span>
                      <strong>{formatCurrency(totalAbonado)}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#DDE3E0] font-bold text-[#B42318]">
                      <span>Saldo Pendiente:</span>
                      <strong>{formatCurrency(saldoPendiente)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de Cancelación Protegida */}
              {order.status !== 'ENTREGADO' && order.status !== 'CANCELADO' && (
                <div className="pt-4 border-t border-[#DDE3E0] flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#B42318] hover:bg-[#FDECEA]"
                    onClick={() => setIsCancelConfirmOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Cancelar esta Orden de Trabajo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GALERÍA MULTIMEDIA */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#66736D]">
                  Bocetos, renders 3D y fotografías de microscopio para inspección de microengaste. Haz clic en cualquier foto para zoom detallado.
                </p>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMockUpload('BOCETO_REFERENCIA')}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Boceto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMockUpload('CONTROL_CALIDAD')}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Foto Calidad
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(order.attachments || []).map((att) => (
                  <div
                    key={att.id}
                    onClick={() => setLightboxImage(att)}
                    className="group relative rounded-xl overflow-hidden border border-[#DDE3E0] bg-white cursor-pointer hover:shadow-lg transition-all"
                  >
                    <div className="aspect-square bg-[#F4F6F8] overflow-hidden">
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] uppercase font-bold text-[#A57525] bg-[#FAF1DA] px-2 py-0.5 rounded">
                          {att.fileType.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-[#9CA9A3]">
                          {formatDate(att.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#17201D] truncate">
                        {att.fileName}
                      </p>
                      {att.description && (
                        <p className="text-[11px] text-[#66736D] line-clamp-1 mt-0.5">
                          {att.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MATERIA PRIMA CONSUMIDA */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#66736D]">
                  Gramos de metal fino y quilates de gemas asignadas y despachadas desde bodega para esta pieza.
                </p>
              </div>

              <div className="bg-white border border-[#DDE3E0] rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Material / Gema</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4 text-right">Cantidad Entregada</th>
                      <th className="py-3 px-4 text-right">Unidad</th>
                      <th className="py-3 px-4 text-right">Fecha Despacho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE3E0]">
                    {(order.materialsUsed || []).map((item) => (
                      <tr key={item.id} className="hover:bg-[#F4F6F8]/50">
                        <td className="py-3 px-4 font-semibold text-[#17201D]">
                          {item.material?.name || 'Material'}
                        </td>
                        <td className="py-3 px-4 text-[#66736D]">
                          {item.material?.type}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#17201D]">
                          {formatGrams(item.quantity, '')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#66736D]">
                          {item.material?.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-[#9CA9A3]">
                          {formatDate(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {(!order.materialsUsed || order.materialsUsed.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#9CA9A3]">
                          No se han registrado consumos de bodega aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CIERRE METALÚRGICO */}
          {activeTab === 'metal' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#FAF1DA] border border-[#eedab1] text-xs text-[#A57525] flex items-center justify-between">
                <div>
                  <h5 className="font-bold">Protocolo de Balanza y Control de Mermas</h5>
                  <p className="mt-0.5 text-[#9A6700]">
                    Toda orden debe cerrar su balance: Merma = Metal Entregado - (Joya Terminada + Limalla Devuelta).
                  </p>
                </div>
                {onOpenMetalReturn && (
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => onOpenMetalReturn(order)}
                  >
                    Registrar Liquidación de Mesa
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#DDE3E0] shadow-xs">
                  <span className="text-[10px] font-bold text-[#66736D] uppercase">
                    Metal Total Entregado
                  </span>
                  <p className="text-xl font-mono font-bold text-[#17201D] mt-1">
                    {formatGrams(
                      order.materialsUsed?.reduce((acc, m) => acc + Number(m.quantity), 0) || 0
                    )}
                  </p>
                  <p className="text-[11px] text-[#9CA9A3] mt-1">Pesaje inicial de despacho</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#DDE3E0] shadow-xs">
                  <span className="text-[10px] font-bold text-[#66736D] uppercase">
                    Umbral Máximo de Merma
                  </span>
                  <p className="text-xl font-mono font-bold text-[#A57525] mt-1">
                    8.00 %
                  </p>
                  <p className="text-[11px] text-[#9CA9A3] mt-1">Tolerancia técnica de fundición</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#DDE3E0] shadow-xs">
                  <span className="text-[10px] font-bold text-[#66736D] uppercase">
                    Destino de Limalla
                  </span>
                  <p className="text-xl font-mono font-bold text-[#17734B] mt-1">
                    Retorno Automático
                  </p>
                  <p className="text-[11px] text-[#9CA9A3] mt-1">Se reingresa a bodega al liquidar</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CAJA Y ABONOS */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#17201D]">Historial de Pagos y Caja</h4>
                  <p className="text-xs text-[#66736D]">
                    Saldo pendiente por liquidar: <strong>{formatCurrency(saldoPendiente)}</strong>
                  </p>
                </div>

                {saldoPendiente > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsPaymentModalOpen(true)}
                  >
                    <DollarSign className="w-4 h-4 mr-1" />
                    Registrar Nuevo Abono
                  </Button>
                )}
              </div>

              <div className="bg-white border border-[#DDE3E0] rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4">Registrado Por</th>
                      <th className="py-3 px-4">Referencia / Notas</th>
                      <th className="py-3 px-4 text-right">Monto</th>
                      <th className="py-3 px-4 text-center">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE3E0]">
                    {(order.payments || []).map((pay) => (
                      <tr key={pay.id} className="hover:bg-[#F4F6F8]/50">
                        <td className="py-3 px-4 text-[#17201D] font-mono">
                          {formatDate(pay.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F0] text-[#17201D]">
                            {pay.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#66736D]">
                          {pay.registeredBy?.fullName || 'Caja Alkisu'}
                        </td>
                        <td className="py-3 px-4 text-[#66736D]">
                          {pay.referenceNotes || 'Abono a orden'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#17734B]">
                          {formatCurrency(pay.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              setReceiptPayment({
                                ...pay,
                                orderId: order.id,
                                client: order.client,
                              })
                            }
                            className="p-1 text-[#176B52] hover:bg-[#E5F4EE] rounded"
                            title="Ver recibo imprimible"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!order.payments || order.payments.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#9CA9A3]">
                          No hay abonos registrados para esta joya.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: HISTORIAL DE ESTADOS INMUTABLE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <p className="text-xs text-[#66736D]">
                Línea de tiempo inmutable con registro cronológico de usuarios, cambios de estado y notas de taller.
              </p>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DDE3E0]">
                {(order.statusHistory || []).map((sh, idx) => (
                  <div key={sh.id || idx} className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-[#176B52] border-2 border-white shadow-xs" />
                    <div className="bg-white p-3.5 rounded-xl border border-[#DDE3E0] shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#17201D]">
                            {sh.fromStatus} → {sh.toStatus}
                          </span>
                          <span className="text-[10px] text-[#66736D]">
                            por {sh.user?.fullName || 'Sistema'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#9CA9A3]">
                          {formatDate(sh.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-[#66736D]">{sh.note || 'Actualización de fase'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL PARA REGISTRAR ABONO */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        maxWidth="md"
        title="Registrar Abono a la Orden"
      >
        <form onSubmit={handleRegisterPayment} className="space-y-4">
          <div className="p-3 rounded-lg bg-[#FAF1DA] text-[#A57525] text-xs">
            Saldo pendiente actual: <strong>{formatCurrency(saldoPendiente)}</strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Monto a Abonar (COP)
            </label>
            <input
              type="number"
              min="1000"
              max={saldoPendiente}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Ej: 3000000"
              className="w-full px-3 py-2 text-sm border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Método de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
            >
              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option value="EFECTIVO">Efectivo en Mostrador</option>
              <option value="TARJETA">Tarjeta Débito/Crédito</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Comprobante / Referencia
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Ej: Aprobación #88412 Bancolombia"
              className="w-full px-3 py-2 text-sm border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={addPaymentMutation.isPending}>
              Guardar Abono & Imprimir
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE COMPROBANTE IMPRIMIBLE */}
      <Modal
        isOpen={!!receiptPayment}
        onClose={() => setReceiptPayment(null)}
        maxWidth="md"
        title="Comprobante de Caja - Alkisu Joyería"
      >
        {receiptPayment && (
          <div className="space-y-4 text-[#17201D]">
            <div className="p-6 bg-[#F4F6F8] rounded-xl border border-[#DDE3E0] space-y-3 font-mono text-xs">
              <div className="text-center pb-3 border-b border-[#DDE3E0]">
                <h4 className="font-serif font-bold text-base text-[#17201D]">ALKISU JOYERÍA</h4>
                <p className="text-[10px] text-[#66736D]">NIT: 901.442.189-1 | TALLER DE ALTA GAMA</p>
                <p className="text-[10px] text-[#66736D]">Medellín - Bogotá, Colombia</p>
              </div>

              <div className="flex justify-between text-xs">
                <span>Orden #:</span>
                <strong>{receiptPayment.orderId}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>Cliente:</span>
                <strong>{receiptPayment.client?.fullName}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>Método:</span>
                <strong>{receiptPayment.paymentMethod}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span>Fecha y Hora:</span>
                <span>{new Date(receiptPayment.createdAt || Date.now()).toLocaleString()}</span>
              </div>

              <div className="pt-3 border-t border-[#DDE3E0] flex justify-between text-sm font-bold text-[#17734B]">
                <span>MONTO ABONADO:</span>
                <span>{formatCurrency(receiptPayment.amount)}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReceiptPayment(null)}
              >
                Cerrar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Imprimir Recibo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRMACIÓN DE CANCELACIÓN DESTRUCCIÓN PROTEGIDA */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        maxWidth="md"
        title="Confirmar Cancelación de la Orden"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#FDECEA] border border-[#f9c5c0] rounded-lg text-xs text-[#B42318] flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>
              Esta acción detendrá la producción técnica y registrará la cancelación en el libro de auditoría inmutable.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Motivo de la Cancelación:
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: Desistimiento por parte del cliente antes de corte..."
              className="w-full px-3 py-2 text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#B42318]"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(false)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancel}
              isLoading={cancelOrderMutation.isPending}
            >
              Confirmar Cancelación
            </Button>
          </div>
        </div>
      </Modal>

      {/* LIGHTBOX CON ZOOM PARA INSPECCIÓN */}
      <Lightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.fileUrl || ''}
        title={lightboxImage?.fileName}
        description={lightboxImage?.description || undefined}
      />
    </>
  );
};
