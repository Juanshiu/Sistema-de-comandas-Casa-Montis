'use client';

import { useState } from 'react';
import { AlertTriangle, Eye, X, LogIn, Shield } from 'lucide-react';

interface ImpersonarModalProps {
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol_nombre: string | null;
  };
  empresa: {
    id: string;
    nombre: string;
  };
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

/**
 * Modal de confirmación para iniciar impersonación
 * 
 * ⚠️ Muestra advertencia clara sobre el modo soporte
 * ⚠️ Requiere confirmación explícita
 */
export function ImpersonarModal({ 
  usuario, 
  empresa, 
  onClose, 
  onConfirm,
  loading = false 
}: ImpersonarModalProps) {
  const [confirmado, setConfirmado] = useState(false);

  const handleConfirm = async () => {
    if (!confirmado) return;
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full border border-slate-600 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Eye className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Modo Soporte</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Warning Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-300">
                <p className="font-medium mb-1">⚠️ Acción de Soporte Auditada</p>
                <p className="text-amber-300/80">
                  Esta acción quedará registrada en el sistema de auditoría. 
                  Solo debe usarse para fines de soporte técnico legítimo.
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-sky-400" />
              <span className="text-slate-400">Empresa:</span>
              <span className="text-white font-medium">{empresa.nombre}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <LogIn className="w-4 h-4 text-sky-400" />
              <span className="text-slate-400">Entrar como:</span>
              <span className="text-white font-medium">{usuario.nombre}</span>
            </div>
            <div className="text-xs text-slate-500 pl-6">
              {usuario.email} • {usuario.rol_nombre || 'Sin rol asignado'}
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-500 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">
              Confirmo que esta impersonación es para fines de soporte técnico 
              y que mis acciones quedarán registradas.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmado || loading}
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Entrar como Usuario
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ImpersonationBannerProps {
  usuario: {
    nombre: string;
    email: string;
  };
  empresa: {
    nombre: string;
  };
  onExit: () => void;
  loading?: boolean;
}

/**
 * Banner fijo que se muestra mientras se está en modo impersonación
 * 
 * 🔴 Siempre visible en la parte superior de la pantalla
 * ✅ Botón para salir del modo soporte
 */
export function ImpersonationBanner({ 
  usuario, 
  empresa, 
  onExit,
  loading = false 
}: ImpersonationBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white z-[9999] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
            <Eye className="w-4 h-4" />
            <span className="font-medium text-sm">MODO SOPORTE</span>
          </div>
          <div className="text-sm">
            <span className="opacity-80">Impersonando a </span>
            <span className="font-semibold">{usuario.nombre}</span>
            <span className="opacity-60 text-xs ml-2">({empresa.nombre})</span>
          </div>
        </div>
        
        <button
          onClick={onExit}
          disabled={loading}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saliendo...
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              Salir del modo soporte
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface ImpersonarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Botón para iniciar impersonación en la lista de usuarios
 */
export function ImpersonarButton({ 
  onClick, 
  disabled = false,
  size = 'md'
}: ImpersonarButtonProps) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-sm';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 ${sizeClasses} bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      title="Entrar como este usuario (Modo Soporte)"
    >
      <Eye className="w-3.5 h-3.5" />
      <span>Impersonar</span>
    </button>
  );
}
