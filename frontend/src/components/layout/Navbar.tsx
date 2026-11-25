import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';
import { Shield, UserCheck, Hammer, AlertTriangle, LogOut, Scale } from 'lucide-react';
import { useDashboardMetrics } from '../../api/hooks';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { data: metrics } = useDashboardMetrics();

  const roleConfigs: Record<Role, { label: string; icon: any; focusText: string; badgeClass: string }> = {
    ADMIN: {
      label: 'Dirección General & Auditoría',
      icon: Shield,
      focusText: 'Visión financiera global, autorizaciones y control de pérdidas de metal',
      badgeClass: 'bg-[#FAF1DA] text-[#A57525] border-[#eedab1]',
    },
    ASESOR: {
      label: 'Asesoría Comercial & Vitrina',
      icon: UserCheck,
      focusText: 'Atención a clientes, cotizaciones en vivo y recepción de abonos',
      badgeClass: 'bg-[#EAF1FC] text-[#2457A6] border-[#c6daf7]',
    },
    JOYERO: {
      label: 'Maestro Joyero & Banco de Trabajo',
      icon: Hammer,
      focusText: 'Mesa de trabajo, pesaje técnico de balanza y cálculo de merma',
      badgeClass: 'bg-[#E6F5ED] text-[#17734B] border-[#c1e7d4]',
    },
  };

  const currentConfig = roleConfigs[role];
  const Icon = currentConfig.icon;

  return (
    <header className="h-16 bg-white border-b border-[#DDE3E0] px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Entorno y Foco del rol */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-[#E5F4EE] text-[#176B52]">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-[#17201D]">{currentConfig.label}</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${currentConfig.badgeClass}`}>
              {role}
            </span>
          </div>
          <p className="text-xs text-[#66736D] hidden md:block">
            {currentConfig.focusText}
          </p>
        </div>
      </div>

      {/* Indicadores de Taller y Perfil de Usuario Real */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        

        {/* Alerta de inventario */}
        {metrics && metrics.inventario.materialesCriticosCount > 0 && (
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-[#FFF4D6] border border-[#fce49f] rounded-full text-xs font-medium text-[#9A6700]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#9A6700]" />
            <span>{metrics.inventario.materialesCriticosCount} metales críticos</span>
          </div>
        )}

        {/* Perfil del Usuario Autenticado */}
        <div className="flex items-center space-x-3 pl-3 border-l border-[#DDE3E0]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-[#176B52] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#17201D] leading-tight">
                {user?.fullName || 'Usuario Papoi'}
              </p>
              <p className="text-[10px] text-[#66736D] leading-tight">
                {user?.email || 'sesion@joyeria.com'}
              </p>
            </div>
          </div>

          {/* Botón Cerrar Sesión */}
          <button
            onClick={logout}
            title="Cerrar Sesión"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#66736D] hover:text-[#B42318] hover:bg-[#FDECEA] border border-[#DDE3E0] hover:border-[#FDECEA] transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
