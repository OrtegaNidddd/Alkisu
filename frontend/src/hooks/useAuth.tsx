import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, User } from '../types';

export const REAL_ROLE_TOKENS: Record<Role, string> = {
  ADMIN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI4MzRlNzFlLTAxODUtNDM3NS1iYzlhLTMxODEzNjQ2MDllYSIsImVtYWlsIjoiYWRtaW5Aam95ZXJpYS5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3OTEzMzQzOTIsImV4cCI6MTgyMjg3MDM5Mn0.Eyv6isvyvGJnyiP1NAl-yqL51Gsl8OvguOPoAh7a3L0',
  ASESOR: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImE3NzRiNzQ3LWY4ZjMtNGU4OS1hZjdjLTcwOWEzYWI2N2U4ZSIsImVtYWlsIjoiYXNlc29yQGpveWVyaWEuY29tIiwicm9sZSI6IkFTRVNPUiIsImlhdCI6MTc5MTMzNDM5MiwiZXhwIjoxODIyODcwMzkyfQ.Fdm0hs4TUu2nry5bSXruhCZSDfcu2k33DpQm1ZUEL8U',
  JOYERO: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgwZWY0MWFkLWI1MWYtNGMzMC04YWViLTM3NDk1MzU3OGUxNCIsImVtYWlsIjoiam95ZXJvQGpveWVyaWEuY29tIiwicm9sZSI6IkpPWUVSTyIsImlhdCI6MTc5MTMzNDM5MiwiZXhwIjoxODIyODcwMzkyfQ.9pWsdAt3goKtRnD66O-PnQbDaFa3VwCetqRbAKsEoj8',
};

export const DB_USERS: Record<Role, User> = {
  ADMIN: {
    id: '2834e71e-0185-4375-bc9a-3181364609ea',
    fullName: 'Director General Alkisu',
    email: 'admin@joyeria.com',
    role: 'ADMIN',
  },
  ASESOR: {
    id: 'a774b747-f8f3-4e89-af7c-709a3ab67e8e',
    fullName: 'Valeria Morales (Asesora Comercial)',
    email: 'asesor@joyeria.com',
    role: 'ASESOR',
  },
  JOYERO: {
    id: '80ef41ad-b51f-4c30-8aeb-374953578e14',
    fullName: 'Maestro Mateo Rivera (Joyero)',
    email: 'joyero@joyeria.com',
    role: 'JOYERO',
  },
};

interface AuthContextType {
  user: User | null;
  role: Role;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { fullName: string; email: string; password: string; role: Role }) => Promise<void>;
  logout: () => void;
  switchRole: (role: Role) => void;
  isAuthenticated: boolean;
  activeToken: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('alkisu_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return null;
  });

  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem('alkisu_token') || '';
  });

  const login = async (email: string, password: string) => {
    const API_BASE = '/api';
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Credenciales inválidas');
      }
      const data = await res.json();
      setCurrentUser(data.user);
      setToken(data.token);
      localStorage.setItem('alkisu_user', JSON.stringify(data.user));
      localStorage.setItem('alkisu_token', data.token);
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') {
        throw e;
      }
      // Demo fallback if backend is offline
      const mock = Object.values(DB_USERS).find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (mock && (password === 'alkisu123' || password === 'admin123')) {
        const mockToken = REAL_ROLE_TOKENS[mock.role];
        setCurrentUser(mock);
        setToken(mockToken);
        localStorage.setItem('alkisu_user', JSON.stringify(mock));
        localStorage.setItem('alkisu_token', mockToken);
        return;
      }
      throw new Error(e.message || 'Error al iniciar sesión');
    }
  };

  const register = async (payload: { fullName: string; email: string; password: string; role: Role }) => {
    const API_BASE = '/api';
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al registrar usuario');
      }
      // Auto-login
      await login(payload.email, payload.password);
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch') {
        throw e;
      }
      const newUser: User = {
        id: `usr-${Date.now()}`,
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
      };
      const mockToken = REAL_ROLE_TOKENS[payload.role];
      setCurrentUser(newUser);
      setToken(mockToken);
      localStorage.setItem('alkisu_user', JSON.stringify(newUser));
      localStorage.setItem('alkisu_token', mockToken);
    }
  };

  const logout = () => {
    localStorage.removeItem('alkisu_user');
    localStorage.removeItem('alkisu_token');
    setCurrentUser(null);
    setToken('');
  };

  const switchRole = (newRole: Role) => {
    const user = DB_USERS[newRole];
    setCurrentUser(user);
    setToken(REAL_ROLE_TOKENS[newRole]);
    localStorage.setItem('alkisu_user', JSON.stringify(user));
    localStorage.setItem('alkisu_token', REAL_ROLE_TOKENS[newRole]);
  };

  const activeRole: Role = currentUser ? currentUser.role : 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        role: activeRole,
        login,
        register,
        logout,
        switchRole,
        isAuthenticated: !!currentUser,
        activeToken: token || (currentUser ? REAL_ROLE_TOKENS[currentUser.role] : ''),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
