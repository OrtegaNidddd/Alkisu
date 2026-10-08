import React, { useState, useEffect } from 'react';
import { Material, MaterialType, MeasurementUnit } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Boxes, Edit3, PlusCircle, AlertCircle, Sparkles } from 'lucide-react';
import { useCreateMaterial, useUpdateMaterial } from '../../api/hooks';

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: Material | null;
}

const MATERIAL_TYPES: { value: MaterialType; label: string; defaultUnit: MeasurementUnit }[] = [
  { value: 'ORO_AMARILLO_18K', label: 'Oro Amarillo 18K (750)', defaultUnit: 'GRAMOS' },
  { value: 'ORO_BLANCO_18K', label: 'Oro Blanco 18K', defaultUnit: 'GRAMOS' },
  { value: 'ORO_ROSA_18K', label: 'Oro Rosa 18K', defaultUnit: 'GRAMOS' },
  { value: 'ORO_14K', label: 'Oro 14K (585)', defaultUnit: 'GRAMOS' },
  { value: 'ORO_10K', label: 'Oro 10K (417)', defaultUnit: 'GRAMOS' },
  { value: 'PLATA_925', label: 'Plata Ley 925', defaultUnit: 'GRAMOS' },
  { value: 'PIEDRA_PRECIOSA', label: 'Piedra Preciosa / Gema', defaultUnit: 'KILATES' },
];

export const MaterialFormModal: React.FC<MaterialFormModalProps> = ({
  isOpen,
  onClose,
  material,
}) => {
  const isEditing = Boolean(material);

  const [name, setName] = useState('');
  const [type, setType] = useState<MaterialType>('ORO_AMARILLO_18K');
  const [unit, setUnit] = useState<MeasurementUnit>('GRAMOS');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateMaterial();
  const updateMutation = useUpdateMaterial();

  useEffect(() => {
    if (material) {
      setName(material.name);
      setType(material.type);
      setUnit(material.unit);
      setStock(material.stock.toString());
      setMinStock(material.minStock.toString());
      setError(null);
    } else {
      setName('');
      setType('ORO_AMARILLO_18K');
      setUnit('GRAMOS');
      setStock('');
      setMinStock('10');
      setError(null);
    }
  }, [material, isOpen]);

  const handleTypeChange = (newType: MaterialType) => {
    setType(newType);
    if (!isEditing) {
      const selected = MATERIAL_TYPES.find((t) => t.value === newType);
      if (selected) {
        setUnit(selected.defaultUnit);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre o descripción del material es obligatorio');
      return;
    }

    const stockNum = parseFloat(stock);
    const minStockNum = parseFloat(minStock);

    if (isNaN(stockNum) || stockNum < 0) {
      setError('El stock debe ser un número válido mayor o igual a cero');
      return;
    }

    if (isNaN(minStockNum) || minStockNum < 0) {
      setError('El umbral mínimo de stock debe ser un número mayor o igual a cero');
      return;
    }

    try {
      if (isEditing && material) {
        await updateMutation.mutateAsync({
          id: material.id,
          data: {
            name: name.trim(),
            type,
            unit,
            stock: stockNum,
            minStock: minStockNum,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          type,
          unit,
          stock: stockNum,
          minStock: minStockNum,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el material en bodega');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-[#E5F4EE] text-[#176B52]">
            {isEditing ? <Edit3 className="w-5 h-5" /> : <Boxes className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-[#17201D] font-serif">
              {isEditing ? 'Editar Material de Bodega' : 'Registrar Nuevo Insumo / Material'}
            </h3>
            <p className="text-xs text-[#66736D]">
              {isEditing
                ? `Modificando especificaciones de #${material?.name}`
                : 'Alta de metales nobles, piedras preciosas y aleaciones en inventario'}
            </p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FDECEA] border border-[#f9c5c0] rounded-xl flex items-start space-x-2 text-xs text-[#B42318]">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Nombre del Insumo */}
        <div>
          <label className="block text-xs font-semibold text-[#17201D] mb-1">
            Nombre / Descripción del Material <span className="text-[#B42318]">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Oro Amarillo 18K Laminado, Diamante Certificado..."
            className="w-full px-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
          />
        </div>

        {/* Tipo de Metal / Piedra y Unidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Tipo de Metal / Gema
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as MaterialType)}
              className="w-full px-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] focus:outline-none focus:border-[#176B52]"
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Unidad de Medida
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as MeasurementUnit)}
              className="w-full px-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] focus:outline-none focus:border-[#176B52]"
            >
              <option value="GRAMOS">Gramos (g)</option>
              <option value="KILATES">Quilates (ct)</option>
            </select>
          </div>
        </div>

        {/* Stock Actual y Stock Mínimo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              {isEditing ? 'Stock Actual' : 'Stock Inicial'} ({unit === 'GRAMOS' ? 'g' : 'ct'}){' '}
              <span className="text-[#B42318]">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0.000"
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] focus:outline-none focus:border-[#176B52]"
            />
            <span className="text-[10px] text-[#66736D] mt-0.5 block">
              Cantidad neta pesada en balanza
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17201D] mb-1">
              Stock Mínimo (Alerta) ({unit === 'GRAMOS' ? 'g' : 'ct'}){' '}
              <span className="text-[#B42318]">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              required
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="10.000"
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] focus:outline-none focus:border-[#176B52]"
            />
            <span className="text-[10px] text-[#66736D] mt-0.5 block">
              Dispara alerta al llegar a este nivel
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#DDE3E0]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
            {isEditing ? (
              <>
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Actualizar Material
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Registrar en Bodega
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
