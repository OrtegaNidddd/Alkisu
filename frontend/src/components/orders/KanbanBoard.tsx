import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { OrderCard } from './OrderCard';
import { Search, Filter, Plus, Layers } from 'lucide-react';
import { Button } from '../ui/Button';

interface KanbanColumn {
  id: OrderStatus;
  title: string;
  badgeColor: string;
  dotColor: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'CREADO',
    title: '1. Creado / Boceto',
    badgeColor: 'bg-[#EEF1F0] text-[#66736D]',
    dotColor: 'bg-[#9CA9A3]',
  },
  {
    id: 'FABRICACION',
    title: '2. En Fabricación (Mesa)',
    badgeColor: 'bg-[#FAF1DA] text-[#A57525]',
    dotColor: 'bg-[#A57525]',
  },
  {
    id: 'CALIDAD',
    title: '3. Control de Calidad',
    badgeColor: 'bg-[#EAF1FC] text-[#2457A6]',
    dotColor: 'bg-[#2457A6]',
  },
  {
    id: 'ENTREGADO',
    title: '4. Entregado a Cliente',
    badgeColor: 'bg-[#E6F5ED] text-[#17734B]',
    dotColor: 'bg-[#17734B]',
  },
];

interface KanbanBoardProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onCreateOrder?: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  orders,
  onSelectOrder,
  onCreateOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBalanceOnly, setFilterBalanceOnly] = useState(false);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBalance = filterBalanceOnly ? (order.saldoPendiente ?? 0) > 0 : true;

    return matchesSearch && matchesBalance;
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Barra de Filtros y Búsqueda superior */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#DDE3E0] shadow-xs">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#9CA9A3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, joya o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] placeholder:text-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
            />
          </div>

          <button
            onClick={() => setFilterBalanceOnly(!filterBalanceOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition ${
              filterBalanceOnly
                ? 'bg-[#FFF4D6] text-[#9A6700] border-[#fce49f]'
                : 'bg-white text-[#66736D] border-[#DDE3E0] hover:bg-[#F4F6F8]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Con Saldo Pendiente</span>
          </button>
        </div>

        {onCreateOrder && (
          <Button onClick={onCreateOrder} size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Orden de Taller
          </Button>
        )}
      </div>

      {/* Columnas Kanban */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const colOrders = filteredOrders.filter((o) => o.status === column.id);
          return (
            <div
              key={column.id}
              className="flex flex-col bg-[#F4F6F8] rounded-xl border border-[#DDE3E0] p-3 min-h-[500px]"
            >
              {/* Encabezado de Columna */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#DDE3E0]">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${column.dotColor}`} />
                  <h3 className="text-xs font-bold text-[#17201D] uppercase tracking-wider">
                    {column.title}
                  </h3>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${column.badgeColor}`}
                >
                  {colOrders.length}
                </span>
              </div>

              {/* Lista de Tarjetas */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {colOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-44 text-[#9CA9A3] border-2 border-dashed border-[#DDE3E0] rounded-xl p-4 text-center">
                    <Layers className="w-8 h-8 stroke-[1.5] mb-1.5 text-[#DDE3E0]" />
                    <p className="text-xs">No hay piezas en esta fase</p>
                  </div>
                ) : (
                  colOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onClick={() => onSelectOrder(order)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
