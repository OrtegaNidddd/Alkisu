import React, { useState } from 'react';
import { useClients, useOrders } from '../../api/hooks';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Users, Phone, Mail, FileText, Search, Plus } from 'lucide-react';
import { Client, Order } from '../../types';

interface ClientsViewProps {
  onSelectOrder: (order: Order) => void;
  onNewQuoteForClient?: (clientId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  onSelectOrder,
  onNewQuoteForClient,
}) => {
  const { data: clients = [] } = useClients();
  const { data: orders = [] } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0] || null);

  const filteredClients = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const clientOrders = selectedClient
    ? orders.filter((o) => o.clientId === selectedClient.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#17201D]">
            Directorio de Clientes & Vitrina Comercial
          </h2>
          <p className="text-xs text-[#66736D] mt-0.5">
            Historial de compras, pedidos activos y generación ágil de cotizaciones personalizadas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de clientes */}
        <div className="bg-white rounded-xl border border-[#DDE3E0] p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#9CA9A3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4F6F8] border border-[#DDE3E0] rounded-lg text-[#17201D] focus:outline-none focus:border-[#176B52]"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredClients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  selectedClient?.id === c.id
                    ? 'border-[#176B52] bg-[#E5F4EE]/40 shadow-xs'
                    : 'border-[#DDE3E0] bg-white hover:bg-[#F4F6F8]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-[#17201D]">{c.fullName}</h4>
                  <span className="text-[10px] text-[#66736D] font-mono">{c.documentId}</span>
                </div>
                <p className="text-[11px] text-[#66736D]">{c.phone}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ficha del cliente seleccionado */}
        <div className="lg:col-span-2 space-y-4">
          {selectedClient ? (
            <div className="bg-white rounded-xl border border-[#DDE3E0] p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#DDE3E0]">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#17201D]">
                    {selectedClient.fullName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#66736D] mt-1">
                    <span className="flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-[#176B52]" />
                      <span>{selectedClient.phone}</span>
                    </span>
                    {selectedClient.email && (
                      <span className="flex items-center space-x-1">
                        <Mail className="w-3.5 h-3.5 text-[#176B52]" />
                        <span>{selectedClient.email}</span>
                      </span>
                    )}
                  </div>
                </div>

                {onNewQuoteForClient && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onNewQuoteForClient(selectedClient.id)}
                  >
                    Nueva Cotización
                  </Button>
                )}
              </div>

              {/* Pedidos del Cliente */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#17201D] mb-3">
                  Historial de Joyas y Pedidos ({clientOrders.length})
                </h4>

                <div className="space-y-3">
                  {clientOrders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => onSelectOrder(ord)}
                      className="p-4 rounded-xl border border-[#DDE3E0] bg-[#F4F6F8] hover:border-[#176B52] transition cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-mono text-[10px] font-bold text-[#A57525]">
                            #{ord.id.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-[#17201D]">
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#66736D] line-clamp-1">
                          {ord.description}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-sm font-bold text-[#17201D] block">
                          {formatCurrency(ord.totalPactado)}
                        </span>
                        <span className="text-[10px] text-[#17734B] font-semibold">
                          Abonado: {formatCurrency(ord.totalAbonado || 0)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {clientOrders.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#9CA9A3] border-2 border-dashed border-[#DDE3E0] rounded-xl">
                      Este cliente aún no tiene órdenes de taller registradas.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[#9CA9A3] bg-white rounded-xl border border-[#DDE3E0]">
              Seleccione un cliente para ver su ficha y pedidos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
