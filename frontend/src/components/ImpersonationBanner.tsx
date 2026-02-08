'use client';

import { useEffect, useState } from 'react';
import { Eye, X, AlertTriangle } from 'lucide-react';

interface ImpersonationData {
  originalAdminId: string;
  originalAdminEmail: string;
  empresaId: string;
  userId: string;
  rol: string;
}

/**
 * Banner de impersonación que se muestra cuando el Super Admin
 * está accediendo al sistema como un usuario de empresa cliente.
 * 
 * ⚠️ Siempre visible en la parte superior de la pantalla
 * ✅ Botón para salir del modo soporte y volver al admin panel
 * ✅ Agrega padding-top automático al body para no tapar el header
 */
export function ImpersonationBanner() {
  const [isActive, setIsActive] = useState(false);
  const [data, setData] = useState<ImpersonationData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar si hay una sesión de impersonación activa
    const checkImpersonation = () => {
      const active = localStorage.getItem('impersonation_active');
      const dataStr = localStorage.getItem('impersonation_data');
      
      if (active === 'true' && dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          setData(parsed);
          setIsActive(true);
        } catch {
          setIsActive(false);
        }
      } else {
        setIsActive(false);
      }
    };

    checkImpersonation();
    
    // Escuchar cambios en localStorage (para cuando se cierra desde otra pestaña)
    window.addEventListener('storage', checkImpersonation);
    
    // Escuchar evento personalizado (para cambios en la misma ventana)
    window.addEventListener('impersonationChanged', checkImpersonation);
    
    return () => {
      window.removeEventListener('storage', checkImpersonation);
      window.removeEventListener('impersonationChanged', checkImpersonation);
    };
  }, []);

  // Agregar padding-top al body cuando el banner está activo
  useEffect(() => {
    if (isActive) {
      document.body.style.paddingTop = '44px'; // Altura del banner
    } else {
      document.body.style.paddingTop = '0';
    }

    // Cleanup al desmontar
    return () => {
      document.body.style.paddingTop = '0';
    };
  }, [isActive]);

  const handleExit = async () => {
    setLoading(true);
    
    try {
      // Obtener el token actual de impersonación
      const token = localStorage.getItem('token');
      
      // Llamar al endpoint para registrar fin de impersonación
      const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'http://localhost:3002';
      
      await fetch(`${adminApiUrl}/api/admin/impersonar/salir`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => {
        // Si falla, no importa, limpiamos localmente
      });

      // Limpiar datos de impersonación
      localStorage.removeItem('impersonation_active');
      localStorage.removeItem('impersonation_data');
      localStorage.removeItem('token');
      
      setIsActive(false);
      
      // Redirigir al admin panel
      const adminPanelUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || 'http://localhost:3002';
      window.location.href = `${adminPanelUrl}/dashboard`;
      
    } catch (err) {
      console.error('Error al salir de impersonación:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white z-[9999] shadow-lg print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
            <Eye className="w-4 h-4" />
            <span className="font-medium text-sm">MODO SOPORTE</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 opacity-80" />
            <span className="opacity-90">
              Estás viendo el sistema como un usuario de la empresa
            </span>
          </div>
        </div>
        
        <button
          onClick={handleExit}
          disabled={loading}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="hidden sm:inline">Saliendo...</span>
            </>
          ) : (
            <>
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Salir del modo soporte</span>
              <span className="sm:hidden">Salir</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
