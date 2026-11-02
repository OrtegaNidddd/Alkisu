import React, { useState, useMemo } from 'react';
import { Order, Material } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatGrams } from '../../utils/formatters';
import { Scale, AlertTriangle, CheckCircle, ShieldCheck, Info, Gem } from 'lucide-react';
import { useRegisterMetalReturn } from '../../api/hooks';

interface MetalReturnModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const MetalReturnModal: React.FC<MetalReturnModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const registerMutation = useRegisterMetalReturn();

  // Estados del formulario de balanza
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [finalPieceWeight, setFinalPieceWeight] = useState<string>('');
  const [scrapWeight, setScrapWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Filtrar estrictamente metales nobles vs gemas/piedras
  const metalMaterials = useMemo(() => {
    if (!order?.materialsUsed) return [];
    return order.materialsUsed.filter(
      (m) => m.material?.unit === 'GRAMOS' || (m.material?.type && m.material.type !== 'PIEDRA_PRECIOSA')
    );
  }, [order?.materialsUsed]);

  const gemMaterials = useMemo(() => {
    if (!order?.materialsUsed) return [];
    return order.materialsUsed.filter(
      (m) => m.material?.unit === 'KILATES' || m.material?.type === 'PIEDRA_PRECIOSA'
    );
  }, [order?.materialsUsed]);

  // Material noble seleccionado para el cierre de balanza
  const activeMaterialUsed = useMemo(() => {
    if (metalMaterials.length === 0) return null;
    if (selectedMaterialId) {
      return metalMaterials.find((m) => m.materialId === selectedMaterialId) || metalMaterials[0];
    }
    return metalMaterials[0];
  }, [metalMaterials, selectedMaterialId]);

  const metalEntregado = activeMaterialUsed ? Number(activeMaterialUsed.quantity) : 0;

  // Cálculo en vivo en pantalla: Merma = Entregado - (Joya + Limalla)
  const calculation = useMemo(() => {
    const joya = parseFloat(finalPieceWeight) || 0;
    const limalla = parseFloat(scrapWeight) || 0;
    const totalDevuelto = joya + limalla;

    if (totalDevuelto === 0) {
      return {
        joya,
        limalla,
        totalDevuelto: 0,
        merma: 0,
        porcentajeMerma: 0,
        isExcess: false,
        isHighLoss: false,
      };
    }

    const isExcess = totalDevuelto > metalEntregado;
    const merma = Math.max(0, Number((metalEntregado - totalDevuelto).toFixed(2)));
    const porcentajeMerma = metalEntregado > 0 ? Number(((merma / metalEntregado) * 100).toFixed(2)) : 0;
    const isHighLoss = porcentajeMerma > 8.0;

    return {
      joya,
      limalla,
      totalDevuelto,
      merma,
      porcentajeMerma,
      isExcess,
      isHighLoss,
    };
  }, [finalPieceWeight, scrapWeight, metalEntregado]);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (calculation.joya <= 0) {
      setErrorMessage('El peso de la joya terminada debe ser mayor a 0.00 g');
      return;
    }

    if (calculation.isExcess) {
      setErrorMessage(
        `El peso total devuelto (${calculation.totalDevuelto.toFixed(2)}g) excede el metal entregado (${metalEntregado.toFixed(2)}g). Verifique la balanza.`
      );
      return;
    }

    if (calculation.isHighLoss && (!notes || notes.trim().length < 5)) {
      setErrorMessage(
        'Alerta de Taller: La merma supera el 8%. Es obligatorio registrar un motivo explicativo técnico antes de cerrar el balance.'
      );
      return;
    }

    try {
      const res = await registerMutation.mutateAsync({
        orderId: order.id,
        payload: {
          materialId: activeMaterialUsed?.materialId || 'mat-1',
          finalPieceWeight: calculation.joya,
          scrapWeight: calculation.limalla,
          notes,
        },
      });
      setSuccessResult(res);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar liquidación de mesa');
    }
  };

  const handleClose = () => {
    setFinalPieceWeight('');
    setScrapWeight('');
    setNotes('');
    setErrorMessage(null);
    setSuccessResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      title={
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-[#FAF1DA] text-[#A57525]">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#17201D]">
              Liquidación de Metal en Mesa
            </h3>
            <p className="text-xs text-[#66736D]">
              Orden #{order.id} | Orfebre: {order.artisan?.fullName || 'Joyero'}
            </p>
          </div>
        </div>
      }
    >
      {successResult ? (
        <div className="space-y-5 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-[#E6F5ED] text-[#17734B] mx-auto flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-[#17201D] font-serif">
              ¡Cierre de Balanza Registrado!
            </h4>
            <p className="text-xs text-[#66736D] mt-1">
              La merma técnica fue registrada y la limalla reingresó a bodega automáticamente.
            </p>
          </div>

          <div className="p-4 bg-[#F4F6F8] rounded-xl border border-[#DDE3E0] text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between">
              <span className="text-[#66736D]">Metal Entregado:</span>
              <strong className="text-[#17201D]">{formatGrams(successResult.balance.metalEntregado)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#66736D]">Joya Terminada:</span>
              <strong className="text-[#17201D]">{formatGrams(successResult.balance.pesoJoyaFinal)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#66736D]">Limalla Retornada:</span>
              <strong className="text-[#17734B]">{formatGrams(successResult.balance.limallaRetornada)}</strong>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#DDE3E0] font-bold">
              <span>Merma Técnica:</span>
              <span className={successResult.balance.mermaInusual ? 'text-[#9A6700]' : 'text-[#17201D]'}>
                {formatGrams(successResult.balance.mermaTecnica)} ({successResult.balance.porcentajeMerma})
              </span>
            </div>
          </div>

          <Button variant="primary" onClick={handleClose} className="w-full">
            Cerrar Ventana
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="p-3 bg-[#FDECEA] border border-[#f9c5c0] rounded-xl text-xs text-[#B42318] flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Alerta de gemas separadas si existen */}
          {gemMaterials.length > 0 && (
            <div className="p-3.5 bg-[#EAF1FC] border border-[#b8d0f7] rounded-xl text-xs text-[#2457A6] flex items-start space-x-2.5">
              <Gem className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Gemas / Piedras Despachadas ({gemMaterials.length}):</p>
                <p className="text-[11px] mt-0.5 text-[#3b6db3]">
                  {gemMaterials.map((g) => `${g.quantity} ${g.material?.unit || 'ct'} de ${g.material?.name || 'Gema'}`).join(', ')}.
                  <strong className="block mt-0.5 text-[#2457A6]">Nota técnica: Las piedras no entran en fundición ni se computan en la merma metalúrgica de balanza.</strong>
                </p>
              </div>
            </div>
          )}

          {/* Tarjeta de metal noble entregado */}
          <div className="p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block">
                  Metal Noble Asignado para Cierre
                </span>
                {metalMaterials.length > 1 ? (
                  <select
                    value={selectedMaterialId || activeMaterialUsed?.materialId || ''}
                    onChange={(e) => setSelectedMaterialId(e.target.value)}
                    className="mt-1 text-xs font-bold text-[#17201D] bg-white border border-[#DDE3E0] rounded-lg px-2 py-1"
                  >
                    {metalMaterials.map((m) => (
                      <option key={m.materialId} value={m.materialId}>
                        {m.material?.name || 'Metal'} ({m.quantity} g)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm font-bold text-[#17201D] mt-0.5">
                    {activeMaterialUsed?.material?.name || (metalMaterials.length === 0 ? 'Sin metal despachado' : 'Oro 18k')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#66736D] uppercase font-bold block">
                  Metal Entregado (Gramos)
                </span>
                <span className="font-mono text-xl font-bold text-[#17201D]">
                  {formatGrams(metalEntregado)}
                </span>
              </div>
            </div>
          </div>

          {/* Inputs de balanza con 3 decimales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                1. Peso de Joya Terminada
                <span className="text-[#A57525] normal-case text-[10px] ml-1 font-normal">
                  (Balanza 0.000 g)
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={metalEntregado}
                  value={finalPieceWeight}
                  onChange={(e) => setFinalPieceWeight(e.target.value)}
                  placeholder="ej. 7.250"
                  className="w-full px-3 py-2.5 font-mono text-base font-bold border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white pr-10"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#66736D]">
                  g
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                2. Limalla y Sobrante Devuelto
                <span className="text-[#66736D] normal-case text-[10px] ml-1 font-normal">
                  (Para bodega)
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max={metalEntregado}
                  value={scrapWeight}
                  onChange={(e) => setScrapWeight(e.target.value)}
                  placeholder="ej. 2.300"
                  className="w-full px-3 py-2.5 font-mono text-base font-bold border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52] bg-white pr-10"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#66736D]">
                  g
                </span>
              </div>
            </div>
          </div>

          {/* CÁLCULO EN VIVO EN PANTALLA */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              calculation.isExcess
                ? 'bg-[#FDECEA] border-[#f9c5c0]'
                : calculation.isHighLoss
                ? 'bg-[#FFF4D6] border-[#fce49f]'
                : 'bg-[#E6F5ED] border-[#c1e7d4]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#17201D]">
                Cálculo de Merma Técnica en Vivo:
              </span>
              <span
                className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                  calculation.isExcess
                    ? 'text-[#B42318] bg-[#fbd3cf]'
                    : calculation.isHighLoss
                    ? 'text-[#9A6700] bg-[#fae8b2]'
                    : 'text-[#17734B] bg-[#d3eedf]'
                }`}
              >
                {calculation.porcentajeMerma}% Merma
              </span>
            </div>

            <div className="font-mono text-xs space-y-1 text-[#17201D]">
              <div className="flex justify-between">
                <span>Metal devuelto total (Joya + Limalla):</span>
                <strong>{formatGrams(calculation.totalDevuelto)}</strong>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-black/10">
                <span>Merma neta resultante:</span>
                <span>{formatGrams(calculation.merma)}</span>
              </div>
            </div>

            {/* Aviso si merma > 8% */}
            {calculation.isHighLoss && !calculation.isExcess && (
              <div className="mt-3 pt-3 border-t border-[#fce49f] flex items-start space-x-2 text-xs text-[#9A6700]">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>¡Atención Maestro!</strong> La merma supera el umbral técnico del 8%. Debe especificar la causa (ej. lima gruesa, fundición en crisol nuevo, pulido profundo).
                </p>
              </div>
            )}
          </div>

          {/* Campo obligatorio de motivo si la merma > 8% */}
          {calculation.isHighLoss && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9A6700] mb-1.5">
                Motivo Explicativo de la Merma (Requerido):
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indique la causa técnica de la merma inusual..."
                className="w-full px-3 py-2 text-xs border border-[#fce49f] bg-[#FFF4D6]/30 rounded-lg focus:outline-none focus:border-[#9A6700]"
                required
              />
            </div>
          )}

          {/* Botones de acción ergonómicos */}
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={calculation.isHighLoss ? 'gold' : 'joyero'}
              size="workbench"
              isLoading={registerMutation.isPending}
              disabled={calculation.isExcess || (calculation.isHighLoss && (!notes || notes.trim().length < 5))}
            >
              <ShieldCheck className="w-5 h-5 mr-2" />
              Cerrar Mesa & Reintegrar Limalla
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
