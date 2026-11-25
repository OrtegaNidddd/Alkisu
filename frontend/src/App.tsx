import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Sidebar } from './components/layout/Sidebar';
import { KanbanBoard } from './components/orders/KanbanBoard';
import { OrderDetailModal } from './components/orders/OrderDetailModal';
import { WorkbenchView } from './components/workbench/WorkbenchView';
import { InventoryView } from './components/inventory/InventoryView';
import { QuoteBuilder } from './components/quotes/QuoteBuilder';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { SalesDashboard } from './components/dashboard/SalesDashboard';
import { WorkshopDashboard } from './components/dashboard/WorkshopDashboard';
import { ClientsView } from './components/clients/ClientsView';
import { PaymentsView } from './components/payments/PaymentsView';
import { AuditView } from './components/audit/AuditView';
import { MetalReturnModal } from './components/workbench/MetalReturnModal';
import { AuthView } from './components/auth/AuthView';
import { useOrders } from './api/hooks';
import { apiClient } from './api/client';
import { Order } from './types';
import { cn } from './utils/cn';
import { PanelLeftOpen } from 'lucide-react';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 min
    },
  },
});

const MainApp: React.FC = () => {
  const { user, role } = useAuth();
  const { data: orders = [], refetch: refetchOrders } = useOrders();

  // Estado de Sidebar colapsable / visible
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('papoi_sidebar_open');
    if (saved !== null) return saved !== 'false';
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      localStorage.setItem('papoi_sidebar_open', String(!prev));
      return !prev;
    });
  };

  // Tab activo por defecto según el rol del usuario
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [metalReturnOrder, setMetalReturnOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Al cambiar de usuario o ingresar, abrir su dashboard correspondiente
    setCurrentTab('dashboard');
  }, [role, user?.id]);

  // Al navegar a órdenes o banco de trabajo, asegurar datos frescos del servidor
  useEffect(() => {
    if (currentTab === 'orders' || currentTab === 'workbench') {
      refetchOrders();
    }
  }, [currentTab, refetchOrders]);

  // Mantener selectedOrder sincronizado si la lista de pedidos se actualiza
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated && (updated.updatedAt !== selectedOrder.updatedAt || updated.status !== selectedOrder.status || updated.totalAbonado !== selectedOrder.totalAbonado)) {
        setSelectedOrder(updated);
      }
    }
  }, [orders]);

  // Manejar apertura de orden desde cualquier submódulo
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F4F6F8]">
      {/* Sidebar RBAC Ocultable / Drawer en Móvil */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
      />

      {/* Área Principal de Contenido */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Barra superior: siempre visible en móvil para acceder al menú, y en desktop solo si el sidebar está cerrado */}
        <div
          className={cn(
            "h-12 px-4 sm:px-6 bg-white border-b border-[#DDE3E0] items-center justify-between flex-shrink-0 z-20 shadow-2xs",
            isSidebarOpen ? "flex md:hidden" : "flex"
          )}
        >
          <button
            onClick={handleToggleSidebar}
            className="flex items-center space-x-2 text-xs font-bold text-[#17201D] hover:text-[#176B52] transition cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-[#F4F6F8] border border-[#DDE3E0]"
          >
            <PanelLeftOpen className="w-4 h-4 text-[#A57525]" />
            <span>Menú</span>
          </button>

          <span className="font-serif text-xs font-bold tracking-widest text-[#17201D] uppercase">
            PAPOI JOYERÍA
          </span>
        </div>

        {/* Contenedor de Vistas */}
        <main className="flex-1 p-3 sm:p-6 overflow-y-auto min-w-0">
          <ErrorBoundary>
            {/* DASHBOARD DINÁMICO POR ROL */}
            {currentTab === 'dashboard' && (
              <>
                {role === 'ADMIN' && (
                  <ExecutiveDashboard
                    onNavigateToTab={setCurrentTab}
                    onSelectOrder={handleSelectOrder}
                  />
                )}
                {role === 'ASESOR' && (
                  <SalesDashboard
                    onNavigateToTab={setCurrentTab}
                    onSelectOrder={handleSelectOrder}
                  />
                )}
                {role === 'JOYERO' && (
                  <WorkshopDashboard
                    onNavigateToTab={setCurrentTab}
                    onSelectOrder={handleSelectOrder}
                  />
                )}
              </>
            )}

            {currentTab === 'workbench' && (
              <WorkbenchView
                orders={orders}
                onSelectOrder={handleSelectOrder}
              />
            )}

            {currentTab === 'orders' && (
              <KanbanBoard
                orders={orders}
                onSelectOrder={handleSelectOrder}
                onCreateOrder={() => setCurrentTab('quotes')}
              />
            )}

            {currentTab === 'quotes' && (
              <QuoteBuilder
                onQuoteApproved={async (orderId) => {
                  setCurrentTab('orders');
                  await queryClient.invalidateQueries({ queryKey: ['orders'] });
                  const { data: refreshedOrders } = await refetchOrders();
                  try {
                    const fetched = await apiClient.getOrder(orderId);
                    if (fetched) setSelectedOrder(fetched);
                  } catch {
                    const found = refreshedOrders?.find((o) => o.id === orderId) || orders.find((o) => o.id === orderId);
                    if (found) setSelectedOrder(found);
                  }
                }}
              />
            )}

            {currentTab === 'inventory' && <InventoryView />}

            {currentTab === 'clients' && (
              <ClientsView
                onSelectOrder={handleSelectOrder}
                onNewQuoteForClient={() => setCurrentTab('quotes')}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView onSelectOrder={handleSelectOrder} />
            )}

            {currentTab === 'audit' && <AuditView />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Ficha Detallada de la Joya (6 pestañas) */}
      {selectedOrder && (
        <ErrorBoundary resetKey={selectedOrder.id} key={selectedOrder.id}>
          <OrderDetailModal
            order={selectedOrder}
            isOpen={true}
            onClose={() => setSelectedOrder(null)}
            onOpenMetalReturn={(order) => {
              setSelectedOrder(null);
              setMetalReturnOrder(order);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Modal de Liquidación de Metal */}
      <MetalReturnModal
        order={metalReturnOrder}
        isOpen={!!metalReturnOrder}
        onClose={() => setMetalReturnOrder(null)}
      />
    </div>
  );
};

const RootNavigation: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <AuthView />;
  }
  return <MainApp />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </QueryClientProvider>
  );
}
