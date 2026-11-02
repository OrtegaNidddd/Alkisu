import React, { useState, useMemo } from 'react';
import { useOrders, useAddPayment } from '../../api/hooks';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CreditCard, DollarSign, Printer, ArrowUpRight, Search, PlusCircle, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { Order, PaymentMethod } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface PaymentsViewProps {
  onSelectOrder: (order: Order) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onSelectOrder }) => {
  const { data: orders = [] } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFERENCIA');
  const [referenceNotes, setReferenceNotes] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  const addPaymentMutation = useAddPayment();

  // Consolidar todos los abonos de todas las órdenes
  const allPayments = useMemo(() => {
    return orders
      .flatMap((o) =>
        (o.payments || []).map((p) => ({
          ...p,
          order: o,
        }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const totalRecaudado = useMemo(() => {
    return allPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [allPayments]);

  const totalPorCobrar = useMemo(() => {
    return orders.reduce((acc, o) => acc + Number(o.saldoPendiente || 0), 0);
  }, [orders]);

  const ordersConSaldo = useMemo(() => {
    return orders.filter((o) => Number(o.saldoPendiente || 0) > 0);
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  const filteredPayments = useMemo(() => {
    if (!searchTerm.trim()) return allPayments;
    const term = searchTerm.toLowerCase();
    return allPayments.filter((p) => {
      const orderDesc = p.order?.description?.toLowerCase() || '';
      const clientName = p.order?.client?.fullName?.toLowerCase() || '';
      const orderId = p.order?.id?.toLowerCase() || '';
      const method = p.paymentMethod?.toLowerCase() || '';
      const ref = p.referenceNotes?.toLowerCase() || '';
      return (
        orderDesc.includes(term) ||
        clientName.includes(term) ||
        orderId.includes(term) ||
        method.includes(term) ||
        ref.includes(term)
      );
    });
  }, [allPayments, searchTerm]);

  const handleOpenNewPayment = () => {
    setSelectedOrderId(ordersConSaldo[0]?.id || '');
    setAmount('');
    setReferenceNotes('');
    setActionError(null);
    setIsNewPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!selectedOrderId) {
      setActionError('Seleccione una orden para registrar el abono');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionError('Ingrese un monto válido mayor a cero');
      return;
    }

    const maxPermitido = selectedOrder?.saldoPendiente ?? 0;
    if (amountNum > maxPermitido) {
      setActionError(
        `El monto (${formatCurrency(amountNum)}) supera el saldo pendiente (${formatCurrency(maxPermitido)})`
      );
      return;
    }

    try {
      await addPaymentMutation.mutateAsync({
        orderId: selectedOrderId,
        amount: amountNum,
        paymentMethod,
        referenceNotes,
      });
      setIsNewPaymentModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Error al procesar el pago');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17201D]">
            Caja & Control de Abonos
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Registro consolidado de anticipos, cancelaciones de saldo y comprobantes contables.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button variant="primary" size="sm" onClick={handleOpenNewPayment}>
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Registrar Abono
          </Button>
        </div>
      </div>

      {/* Métricas Financieras */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-[#DDE3E0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D]">
              Total Histórico Recaudado
            </span>
            <Wallet className="w-4 h-4 text-[#17734B]" />
          </div>
          <p className="text-2xl font-mono font-bold text-[#17734B] mt-1">
            {formatCurrency(totalRecaudado)}
          </p>
          <span className="text-xs text-[#66736D] mt-1 block">
            {allPayments.length} transacciones liquidadas
          </span>
        </div>

        <div className="p-4 bg-[#FFF4D6] rounded-xl border border-[#fce49f] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A6700]">
              Saldo Pendiente Global
            </span>
            <DollarSign className="w-4 h-4 text-[#9A6700]" />
          </div>
          <p className="text-2xl font-mono font-bold text-[#9A6700] mt-1">
            {formatCurrency(totalPorCobrar)}
          </p>
          <span className="text-xs text-[#9A6700] mt-1 block font-medium">
            Por cobrar en entrega ({ordersConSaldo.length} órdenes)
          </span>
        </div>

        <div className="p-4 bg-[#EAF1FC] rounded-xl border border-[#d8e6fc] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2457A6]">
              Órdenes en Taller
            </span>
            <CreditCard className="w-4 h-4 text-[#2457A6]" />
          </div>
          <p className="text-2xl font-mono font-bold text-[#2457A6] mt-1">
            {orders.length}
          </p>
          <span className="text-xs text-[#2457A6] mt-1 block">
            Piezas bajo contrato y control comercial
          </span>
        </div>
      </div>

      {/* Barra de Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-[#DDE3E0] shadow-2xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#9CA9A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, orden o referencia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
          />
        </div>

        <span className="text-xs text-[#66736D] font-mono hidden sm:inline">
          Mostrando {filteredPayments.length} de {allPayments.length} abonos
        </span>
      </div>

      {/* Tabla Deslizable de Abonos */}
      <div className="bg-white rounded-xl border border-[#DDE3E0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[700px] text-xs text-left">
            <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Fecha & Hora</th>
                <th className="py-3 px-4 whitespace-nowrap">Orden / Joya</th>
                <th className="py-3 px-4 whitespace-nowrap">Cliente</th>
                <th className="py-3 px-4 whitespace-nowrap">Método</th>
                <th className="py-3 px-4 whitespace-nowrap">Referencia</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Monto Abonado</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3E0]">
              {filteredPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-[#F4F6F8]/60 transition">
                  <td className="py-3 px-4 font-mono text-[#66736D] whitespace-nowrap">
                    {formatDate(pay.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[#A57525] block whitespace-nowrap">
                      #{pay.order?.id?.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-[#66736D] truncate max-w-xs block">
                      {pay.order?.description}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#17201D] whitespace-nowrap">
                    {pay.order?.client?.fullName || 'Cliente de mostrador'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F0] text-[#17201D]">
                      {pay.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#66736D]">
                    {pay.referenceNotes || 'Anticipo estándar'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-sm text-[#17734B] whitespace-nowrap">
                    {formatCurrency(pay.amount)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => {
                        const targetOrder = orders.find((o) => o.id === pay.order?.id) || pay.order;
                        if (targetOrder) {
                          onSelectOrder(targetOrder);
                        }
                      }}
                      className="p-1.5 text-[#176B52] hover:bg-[#E5F4EE] rounded-lg transition"
                      title="Ver ficha técnica de orden"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#9CA9A3]">
                    <Wallet className="w-8 h-8 mx-auto mb-2 text-[#9CA9A3]" />
                    <p className="text-xs font-semibold text-[#17201D]">
                      {allPayments.length === 0
                        ? 'No se han registrado abonos o anticipos en el sistema aún'
                        : 'No se encontraron abonos que coincidan con la búsqueda'}
                    </p>
                    <p className="text-[11px] text-[#66736D] mt-1 max-w-sm mx-auto">
                      Puede registrar nuevos abonos directamente pulsando el botón superior o desde la ficha de cada pedido de taller.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Registrar Nuevo Abono Directo */}
      <Modal
        isOpen={isNewPaymentModalOpen}
        onClose={() => setIsNewPaymentModalOpen(false)}
        maxWidth="md"
        title={
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-[#E5F4EE] text-[#176B52]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#17201D] font-serif">
                Registrar Abono a Pedido
              </h3>
              <p className="text-xs text-[#66736D]">
                Ingreso contable en caja y reducción inmediata de saldo
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          {actionError && (
            <div className="p-3 bg-[#FDECEA] border border-[#f9c5c0] rounded-xl flex items-start space-x-2 text-xs text-[#B42318]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Selector de Orden */}
          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Orden de Taller a Abonar <span className="text-[#B42318]">*</span>
            </label>
            {ordersConSaldo.length === 0 ? (
              <div className="p-3 bg-[#E6F5ED] border border-[#c1e7d4] rounded-lg text-xs text-[#17734B]">
                Todas las órdenes registradas están 100% liquidadas sin saldo pendiente.
              </div>
            ) : (
              <select
                required
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] focus:outline-none focus:border-[#176B52]"
              >
                {ordersConSaldo.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    #{ord.id.toUpperCase()} - {ord.client?.fullName || 'Cliente'} (Saldo: {formatCurrency(ord.saldoPendiente || 0)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedOrder && (
            <div className="p-3 rounded-xl bg-[#FAF1DA] border border-[#eedab1] text-xs text-[#A57525] flex justify-between items-center">
              <div>
                <span className="block font-bold">Saldo Pendiente Actual:</span>
                <span className="text-[11px] text-[#66736D]">
                  Total: {formatCurrency(selectedOrder.totalPactado)} | Abonado: {formatCurrency(selectedOrder.totalAbonado || 0)}
                </span>
              </div>
              <span className="font-mono font-bold text-sm">
                {formatCurrency(selectedOrder.saldoPendiente || 0)}
              </span>
            </div>
          )}

          {/* Monto y Método */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#17201D] mb-1">
                Monto del Abono (COP) <span className="text-[#B42318]">*</span>
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="ej. 2500000"
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] focus:outline-none focus:border-[#176B52]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17201D] mb-1">
                Método de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] focus:outline-none focus:border-[#176B52]"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="EFECTIVO">Efectivo en Caja</option>
                <option value="TARJETA">Tarjeta Débito / Crédito</option>
              </select>
            </div>
          </div>

          {/* Notas y Referencia */}
          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Referencia / Comprobante
            </label>
            <input
              type="text"
              value={referenceNotes}
              onChange={(e) => setReferenceNotes(e.target.value)}
              placeholder="ej. Nequi / Bancolombia Ref #987654..."
              className="w-full px-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#DDE3E0]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewPaymentModalOpen(false)}
              disabled={addPaymentMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={addPaymentMutation.isPending}
              disabled={ordersConSaldo.length === 0}
            >
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Confirmar Abono
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
