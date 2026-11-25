import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login } = useAuth();
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Status & error state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMessage('Por favor ingrese correo y contraseña');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#17211D] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full border border-[#A57525]/15 pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full border border-[#A57525]/15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#176B52]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A57525] to-[#785418] shadow-xl border border-[#c4913b]/40 mb-4">
            <span className="font-serif text-3xl font-extrabold text-white tracking-widest">A</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-[#EDF5F2] uppercase">
            PAPOI JOYERÍA
          </h1>
          <p className="text-xs sm:text-sm font-medium tracking-wide text-[#9CA9A3] mt-1">
            Sistema ERP de Alta Orfebrería & Control de Mermas
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-[#1D2A25] border border-[#2D3F38] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#EDF5F2]">
              Iniciar Sesión
            </h2>
            <p className="text-xs text-[#9CA9A3] mt-1">
              Ingresa tus credenciales autorizadas para acceder a tu entorno de trabajo.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FDECEA] border border-[#fecdca] text-[#B42318] text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA9A3] mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9CA9A3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="usuario@joyeria.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#17211D] border border-[#2B3B34] rounded-xl text-sm font-medium text-[#EDF5F2] placeholder-[#66736D] focus:outline-none focus:border-[#176B52] focus:ring-1 focus:ring-[#176B52]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA9A3] mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9CA9A3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#17211D] border border-[#2B3B34] rounded-xl text-sm font-medium text-[#EDF5F2] placeholder-[#66736D] focus:outline-none focus:border-[#176B52] focus:ring-1 focus:ring-[#176B52]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-[#176B52] hover:bg-[#125541] active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Policy / Admin Registration Note */}
          <div className="mt-6 pt-5 border-t border-[#2B3B34] flex items-start space-x-2.5 text-[#9CA9A3]">
            <ShieldCheck className="w-4 h-4 text-[#A57525] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Las altas de personal y asignaciones de roles son gestionadas exclusivamente por la <strong>Dirección General (Admin)</strong> desde el panel interno.
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6 text-[11px] text-[#66736D]">
          Papoi ERP v2.4 • Gestión Integral de Alta Joyería
        </div>
      </div>
    </div>
  );
};
