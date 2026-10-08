import React, { useState } from 'react';
import { Material } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatGrams } from '../../utils/formatters';
import { Boxes, PlusCircle, AlertCircle } from 'lucide-react';
import { useRestockMaterial } from '../../api/hooks';

interface RestockModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  material,
  isOpen,
  onClose,
}) => {
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const restockMutation = useRestockMaterial();

  if (!material) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Ingrese una cantidad válida mayor a cero');
      return;
    }

    try {
      await restockMutation.mutateAsync({
        id: material.id,
        quantity: qty,
        notes,
      });
      setQuantity('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al reabastecer material');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-[#E5F4EE] text-[#176B52]">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-[#17201D]">
              Reabastecimiento Rápido de Bodega
            </h3>
            <p className="text-xs text-[#66736D]">{material.name}</p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FDECEA] border border-[#f9c5c0] rounded-lg text-xs text-[#B42318] flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-[#F4F6F8] border border-[#DDE3E0] flex justify-between items-center text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#66736D] block">
              Stock Actual en Bodega
            </span>
            <span className="font-mono text-base font-bold text-[#17201D]">
              {formatGrams(material.stock, material.unit)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-[#66736D] block">
              Stock de Seguridad Mínimo
            </span>
            <span className="font-mono text-base font-bold text-[#9A6700]">
              {formatGrams(material.minStock, material.unit)}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
            Cantidad a Ingresar ({material.unit})
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="ej. 50.000"
              className="w-full px-3 py-2 text-sm font-mono font-bold border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#66736D]">
              {material.unit}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
            Motivo / Factura de Compra
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ej. Compra lingote proveedor nacional Lote #882"
            className="w-full px-3 py-2 text-xs border border-[#DDE3E0] rounded-lg focus:outline-none focus:border-[#176B52]"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={restockMutation.isPending}
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Confirmar Ingreso a Bodega
          </Button>
        </div>
      </form>
    </Modal>
  );
};
