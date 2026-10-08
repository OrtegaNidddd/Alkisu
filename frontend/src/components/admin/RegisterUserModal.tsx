import React, { useState } from 'react';
import { Role } from '../../types';
import {
  Shield,
  UserCheck,
  Hammer,
  Lock,
  Mail,
  User as UserIcon,
  X,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface RegisterUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserRegistered?: () => void;
}

export const RegisterUserModal: React.FC<RegisterUserModalProps> = ({
  isOpen,
  onClose,
  onUserRegistered,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('ASESOR');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setErrorMessage('Por favor completa todos los campos');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al registrar usuario');
      }

      setSuccessMessage(`Usuario ${fullName} (${role}) registrado con éxito en el sistema.`);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('ASESOR');
      if (onUserRegistered) onUserRegistered();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al crear la cuenta de personal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#DDE3E0] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#DDE3E0] flex items-center justify-between bg-[#17211D] text-[#EDF5F2]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#A57525] text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-white">
                Registrar Nuevo Personal
              </h3>
              <p className="text-[11px] text-[#9CA9A3]">
                Acceso exclusivo de Administración para dar de alta colaboradores.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9CA9A3] hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-[#E6F5ED] border border-[#c1e7d4] text-[#17734B] text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FDECEA] border border-[#fecdca] text-[#B42318] text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                Nombre Completo
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#66736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Valeria Morales"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F6F8] border border-[#DDE3E0] rounded-xl text-xs sm:text-sm font-medium text-[#17201D] placeholder-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#66736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@joyeria.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F6F8] border border-[#DDE3E0] rounded-xl text-xs sm:text-sm font-medium text-[#17201D] placeholder-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17201D] mb-1.5">
                Contraseña Inicial
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#66736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#F4F6F8] border border-[#DDE3E0] rounded-xl text-xs sm:text-sm font-medium text-[#17201D] placeholder-[#9CA9A3] focus:outline-none focus:border-[#176B52]"
                />
              </div>
            </div>

            {/* Selector de Rol */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#17201D] mb-2">
                Asignación de Rol & Permisos
              </label>
              <div className="space-y-2">
                <label
                  className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                    role === 'ADMIN'
                      ? 'bg-[#FAF1DA]/40 border-[#A57525] ring-1 ring-[#A57525]'
                      : 'bg-[#F4F6F8] border-[#DDE3E0] hover:border-[#176B52]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={role === 'ADMIN'}
                    onChange={() => setRole('ADMIN')}
                    className="mt-0.5 text-[#A57525] focus:ring-0"
                  />
                  <div className="ml-3">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#17201D]">
                      <Shield className="w-3.5 h-3.5 text-[#A57525]" />
                      <span>Director / Administrador</span>
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                    role === 'ASESOR'
                      ? 'bg-[#EAF1FC]/40 border-[#2457A6] ring-1 ring-[#2457A6]'
                      : 'bg-[#F4F6F8] border-[#DDE3E0] hover:border-[#176B52]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="ASESOR"
                    checked={role === 'ASESOR'}
                    onChange={() => setRole('ASESOR')}
                    className="mt-0.5 text-[#2457A6] focus:ring-0"
                  />
                  <div className="ml-3">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#17201D]">
                      <UserCheck className="w-3.5 h-3.5 text-[#2457A6]" />
                      <span>Asesor Comercial (Vitrina)</span>
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                    role === 'JOYERO'
                      ? 'bg-[#E6F5ED]/40 border-[#17734B] ring-1 ring-[#17734B]'
                      : 'bg-[#F4F6F8] border-[#DDE3E0] hover:border-[#176B52]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="JOYERO"
                    checked={role === 'JOYERO'}
                    onChange={() => setRole('JOYERO')}
                    className="mt-0.5 text-[#17734B] focus:ring-0"
                  />
                  <div className="ml-3">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-[#17201D]">
                      <Hammer className="w-3.5 h-3.5 text-[#17734B]" />
                      <span>Maestro Joyero (Taller de Orfebrería)</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Registrando...' : 'Guardar y Crear Cuenta'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
