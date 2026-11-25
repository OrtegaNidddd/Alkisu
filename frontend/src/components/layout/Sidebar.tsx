import React from 'react';
import {
  LayoutDashboard,
  Kanban,
  FileText,
  Boxes,
  Users,
  ShieldCheck,
  Hammer,
  CreditCard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';
import { cn } from '../../utils/cn';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  badge?: string;
}

export const getNavItems = (role: Role): NavItem[] => [
  // ROLE DASHBOARD FOR EVERYONE
  {
    id: 'dashboard',
    label:
      role === 'ADMIN'
        ? 'Dashboard'
        : role === 'ASESOR'
        ? 'Dashboard Comercial'
        : 'Dashboard de Taller',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'ASESOR', 'JOYERO'],
    badge: 'KPIs',
  },
  // JOYERO FOCUSED
  {
    id: 'workbench',
    label: 'Mesa de Trabajo',
    icon: Hammer,
    roles: ['JOYERO', 'ADMIN'],
    badge: 'Taller',
  },
  // CORE OPERATIONS
  {
    id: 'orders',
    label: 'Tablero de Producción',
    icon: Kanban,
    roles: ['ADMIN', 'ASESOR'],
  },
  {
    id: 'quotes',
    label: 'Cotizador Comercial',
    icon: FileText,
    roles: ['ADMIN', 'ASESOR'],
  },
  {
    id: 'inventory',
    label: 'Bodega de Materiales',
    icon: Boxes,
    roles: ['ADMIN', 'JOYERO'],
  },
  {
    id: 'clients',
    label: 'Clientes y Vitrina',
    icon: Users,
    roles: ['ADMIN', 'ASESOR'],
  },
  {
    id: 'payments',
    label: 'Caja y Abonos',
    icon: CreditCard,
    roles: ['ADMIN', 'ASESOR'],
  },
  {
    id: 'audit',
    label: 'Auditoría y Mermas',
    icon: ShieldCheck,
    roles: ['ADMIN'],
  },
];

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onToggle,
}) => {
  const { user, role, logout } = useAuth();

  const filteredItems = getNavItems(role).filter((item) => item.roles.includes(role));

  const handleItemClick = (tabId: string) => {
    onSelectTab(tabId);
    // En móviles, cerrar automáticamente el drawer tras seleccionar la opción
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Fondo oscuro traslúcido en móviles (Backdrop) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity cursor-pointer"
          onClick={onToggle}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={cn(
          "bg-[#17211D] text-[#EDF5F2] h-[100dvh] max-h-[100dvh] select-none border-r border-[#22332C] flex-shrink-0 transition-all duration-300 ease-in-out z-50",
          // En móvil: Drawer flotante que ocupa casi toda la pantalla (85% del ancho móvil)
          "fixed inset-y-0 left-0 w-[85vw] max-w-xs sm:w-80 shadow-2xl overflow-y-auto overscroll-contain",
          // En desktop (md+): Panel lateral integrado al layout
          "md:relative md:z-30 md:shadow-none md:overflow-hidden",
          isOpen
            ? "translate-x-0 opacity-100 md:w-64 pointer-events-auto"
            : "-translate-x-full opacity-0 pointer-events-none md:translate-x-0 md:w-0 md:border-none"
        )}
      >
        <div className="w-full md:w-64 h-full flex flex-col justify-between">
          <div className="flex-shrink-0">
            {/* Brand Header con Botón de Ocultar / Cerrar */}
            <div className="p-5 border-b border-[#22332C] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#A57525] to-[#785418] flex items-center justify-center shadow-lg border border-[#c4913b]/30">
                  <span className="font-serif text-xl font-bold text-white tracking-widest">A</span>
                </div>
                <div>
                  <h1 className="font-serif text-base tracking-[0.2em] font-bold text-[#EDF5F2] uppercase">
                    PAPOI
                  </h1>
                  <p className="text-[10px] tracking-widest text-[#9CA9A3] uppercase">
                    Alta Joyería ERP
                  </p>
                </div>
              </div>

              <button
                onClick={onToggle}
                title="Cerrar menú lateral"
                className="p-1.5 rounded-lg text-[#9CA9A3] hover:text-[#EDF5F2] hover:bg-[#22332C] transition cursor-pointer"
              >
                <PanelLeftClose className="w-5 h-5 hidden md:block" />
                <X className="w-5 h-5 md:hidden" />
              </button>
            </div>

            {/* Role Indicator Banner */}
            <div className="px-6 py-3 bg-[#22332C]/60 border-b border-[#22332C] flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-[#9CA9A3] uppercase">
                Rol Activo
              </span>
              <span
                className={cn(
                  'text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                  role === 'ADMIN' && 'bg-[#FAF1DA] text-[#A57525] border border-[#eedab1]',
                  role === 'ASESOR' && 'bg-[#EAF1FC] text-[#2457A6] border border-[#c6daf7]',
                  role === 'JOYERO' && 'bg-[#E6F5ED] text-[#17734B] border border-[#c1e7d4]'
                )}
              >
                {role}
              </span>
            </div>
          </div>

          {/* Navigation List con scroll independiente */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto min-h-0 overscroll-contain">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA9A3]">
              Módulos Autorizados
            </div>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group',
                    isActive
                      ? 'bg-[#176B52] text-white shadow-sm font-semibold'
                      : 'text-[#9CA9A3] hover:text-[#EDF5F2] hover:bg-[#22332C]'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isActive ? 'text-white' : 'text-[#9CA9A3] group-hover:text-[#EDF5F2]'
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-mono uppercase',
                        isActive
                          ? 'bg-[#125541] text-[#E5F4EE]'
                          : 'bg-[#22332C] text-[#A57525] border border-[#3E564C]'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User profile & Logout con holgura inferior para barras móviles */}
          <div className="p-4 pb-14 sm:pb-8 md:pb-4 border-t border-[#22332C] flex-shrink-0 mt-auto bg-[#17211D]">
            <div className="bg-[#22332C] border border-[#3E564C] rounded-lg p-3">
              <div className="flex items-center space-x-3 mb-2.5">
                <div className="w-8 h-8 rounded-full bg-[#176B52] text-white flex items-center justify-center font-bold text-xs uppercase shadow">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-[#EDF5F2] truncate">
                    {user?.fullName || 'Usuario Papoi'}
                  </p>
                  <p className="text-[11px] text-[#9CA9A3] truncate">
                    {user?.email || 'sesion@joyeria.com'}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 py-1.5 text-xs text-[#9CA9A3] hover:text-[#B42318] hover:bg-[#17211D] rounded border border-transparent hover:border-[#3E564C] transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
</>
);
};
