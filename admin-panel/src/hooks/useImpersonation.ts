'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ImpersonationState {
  isImpersonating: boolean;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  } | null;
  empresa: {
    id: string;
    nombre: string;
  } | null;
  expiraEn: string | null;
}

interface ImpersonationResult {
  success: boolean;
  token?: string;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
  empresa?: {
    id: string;
    nombre: string;
  };
  impersonacion?: {
    expira_en: string;
    originalAdminId: string;
  };
  mensaje?: string;
  error?: string;
}

/**
 * Hook para manejar la funcionalidad de impersonación
 * 
 * Permite al Super Admin iniciar/finalizar sesiones de impersonación
 * y mantener el estado de la sesión actual.
 */
export function useImpersonation() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ImpersonationState>({
    isImpersonating: false,
    usuario: null,
    empresa: null,
    expiraEn: null
  });

  /**
   * Iniciar sesión de impersonación
   */
  const startImpersonation = useCallback(async (
    empresaId: string, 
    usuarioId: string,
    frontendUrl: string
  ): Promise<ImpersonationResult> => {
    setLoading(true);
    setError(null);

    try {
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('No hay sesión de administrador activa');
      }

      const response = await fetch('/api/admin/impersonar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ empresaId, usuarioId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar impersonación');
      }

      // Guardar token original del admin para poder restaurarlo después
      const originalToken = localStorage.getItem('admin_token');
      localStorage.setItem('original_admin_token', originalToken || '');
      
      // Guardar datos de impersonación para el banner
      localStorage.setItem('impersonation_data', JSON.stringify({
        usuario: data.usuario,
        empresa: data.empresa,
        expiraEn: data.impersonacion.expira_en,
        originalAdminId: data.impersonacion.originalAdminId
      }));

      // Actualizar estado local
      setState({
        isImpersonating: true,
        usuario: data.usuario,
        empresa: data.empresa,
        expiraEn: data.impersonacion.expira_en
      });

      return {
        success: true,
        token: data.token,
        usuario: data.usuario,
        empresa: data.empresa,
        impersonacion: data.impersonacion,
        mensaje: data.mensaje
      };

    } catch (err: any) {
      const errorMessage = err.message || 'Error desconocido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Finalizar sesión de impersonación
   */
  const endImpersonation = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Obtener el token de impersonación actual (si existe)
      const impersonationToken = localStorage.getItem('impersonation_token');
      
      if (impersonationToken) {
        // Notificar al backend que la impersonación terminó
        await fetch('/api/admin/impersonar/salir', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${impersonationToken}`
          }
        });
      }

      // Restaurar token original del admin
      const originalToken = localStorage.getItem('original_admin_token');
      if (originalToken) {
        localStorage.setItem('admin_token', originalToken);
      }

      // Limpiar datos de impersonación
      localStorage.removeItem('impersonation_token');
      localStorage.removeItem('impersonation_data');
      localStorage.removeItem('original_admin_token');

      // Resetear estado
      setState({
        isImpersonating: false,
        usuario: null,
        empresa: null,
        expiraEn: null
      });

      // Redirigir al panel admin
      router.push('/dashboard');

      return true;
    } catch (err: any) {
      setError(err.message || 'Error al finalizar impersonación');
      return false;
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Verificar si hay una sesión de impersonación activa
   */
  const checkImpersonationStatus = useCallback(() => {
    const impersonationData = localStorage.getItem('impersonation_data');
    if (impersonationData) {
      try {
        const data = JSON.parse(impersonationData);
        setState({
          isImpersonating: true,
          usuario: data.usuario,
          empresa: data.empresa,
          expiraEn: data.expiraEn
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  return {
    state,
    loading,
    error,
    startImpersonation,
    endImpersonation,
    checkImpersonationStatus
  };
}
