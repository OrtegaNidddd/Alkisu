import React, { useState } from 'react';
import { Material } from '../../types';
import { formatGrams } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RestockModal } from './RestockModal';
import { MaterialFormModal } from './MaterialFormModal';
import {
  Boxes,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  Edit3,
} from 'lucide-react';
import { useMaterials } from '../../api/hooks';
import { useAuth } from '../../hooks/useAuth';

export const InventoryView: React.FC = () => {
  const { role } = useAuth();
  const { data: materials = [], isLoading, refetch } = useMaterials();
  const [selectedMaterialForRestock, setSelectedMaterialForRestock] = useState<Material | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState<Material | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'critical'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const criticalCount = materials.filter((m) => m.stock <= m.minStock).length;

  const filteredMaterials = materials.filter((m) => {
    const isCritical = m.stock <= m.minStock;
    const matchesFilter = activeFilter === 'all' || (activeFilter === 'critical' && isCritical);
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado y Métricas Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17201D]">
            Bodega de Metales y Gemas
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Control de gramajes finos, quilatajes de piedras preciosas y umbrales de reabastecimiento.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Actualizar
          </Button>
          {role === 'ADMIN' && (
            <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar Material
            </Button>
          )}
        </div>
      </div>

      {/* Tarjetas de Resumen de Inventario */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-[#DDE3E0] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736D] block">
            Total Materiales Registrados
          </span>
          <p className="text-2xl font-mono font-bold text-[#17201D] mt-1">
            {materials.length}
          </p>
          <span className="text-xs text-[#66736D] mt-1 block">Metales y gemas certificadas</span>
        </div>

        <div
          onClick={() => setActiveFilter('critical')}
          className="p-4 bg-[#FFF4D6] rounded-xl border border-[#fce49f] cursor-pointer hover:shadow-2xs transition shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A6700]">
              En Nivel Crítico (Bajo Stock)
            </span>
            <AlertTriangle className="w-4 h-4 text-[#9A6700]" />
          </div>
          <p className="text-2xl font-mono font-bold text-[#9A6700] mt-1">
            {criticalCount}
          </p>
          <span className="text-xs text-[#9A6700] mt-1 block font-medium">
            Clic para filtrar materiales en riesgo
          </span>
        </div>

        <div className="p-4 bg-[#E6F5ED] rounded-xl border border-[#c1e7d4] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#17734B]">
              Stock de Oro Amarillo 18k
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#17734B]" />
          </div>
          <p className="text-2xl font-mono font-bold text-[#17734B] mt-1">
            {formatGrams(materials.find((m) => m.type === 'ORO_AMARILLO_18K')?.stock || 0)}
          </p>
          <span className="text-xs text-[#17734B] mt-1 block">En bóveda principal</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DDE3E0] shadow-2xs">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeFilter === 'all'
                ? 'bg-[#176B52] text-white shadow-2xs'
                : 'bg-[#F4F6F8] text-[#66736D] hover:text-[#17201D]'
            }`}
          >
            Todos ({materials.length})
          </button>
          <button
            onClick={() => setActiveFilter('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
              activeFilter === 'critical'
                ? 'bg-[#9A6700] text-white shadow-2xs'
                : 'bg-[#FFF4D6] text-[#9A6700] hover:bg-[#fae8b2]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>En Nivel Crítico ({criticalCount})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#9CA9A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar material o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
          />
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="bg-white rounded-xl border border-[#DDE3E0] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[640px] text-xs text-left">
            <thead className="bg-[#F4F6F8] border-b border-[#DDE3E0] text-[#66736D] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Material / Insumo</th>
                <th className="py-3 px-4 whitespace-nowrap">Tipo de Metal / Piedra</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Stock Actual</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Stock Mínimo</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Estado</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3E0]">
              {filteredMaterials.map((mat) => {
                const isLowStock = mat.stock <= mat.minStock;
                return (
                  <tr
                    key={mat.id}
                    className={`hover:bg-[#F4F6F8]/70 transition-colors ${
                      isLowStock ? 'bg-[#FFF4D6]/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-[#17201D] whitespace-nowrap">
                      {mat.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#66736D] font-mono text-[11px] whitespace-nowrap">
                      {mat.type}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#17201D] whitespace-nowrap">
                      {formatGrams(mat.stock, mat.unit)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#66736D] whitespace-nowrap">
                      {formatGrams(mat.minStock, mat.unit)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isLowStock ? (
                        <Badge variant="warning" size="sm">
                          Stock Crítico
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Óptimo
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        {role === 'ADMIN' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setMaterialToEdit(mat)}
                              className="p-1.5 text-[#66736D] hover:text-[#176B52] hover:bg-[#E5F4EE] rounded-lg transition"
                              title="Editar material"
                              aria-label={`Editar ${mat.name}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <Button
                              size="sm"
                              variant={isLowStock ? 'gold' : 'outline'}
                              onClick={() => setSelectedMaterialForRestock(mat)}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              Reabastecer
                            </Button>
                          </>
                        ) : (
                          <span className="text-[11px] text-[#9CA9A3] italic">
                            Solo Administrador
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#9CA9A3]">
                    No se encontraron materiales que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Reabastecimiento Rápido */}
      <RestockModal
        material={selectedMaterialForRestock}
        isOpen={!!selectedMaterialForRestock}
        onClose={() => setSelectedMaterialForRestock(null)}
      />

      {/* Modal para Registrar Nuevo Material */}
      <MaterialFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal para Editar Material Existente */}
      <MaterialFormModal
        isOpen={!!materialToEdit}
        material={materialToEdit}
        onClose={() => setMaterialToEdit(null)}
      />
    </div>
  );
};
