/**
 * Configuración centralizada del Admin Panel
 * 
 * Este archivo centraliza toda la configuración del panel de administración,
 * incluyendo URLs de API y configuraciones de entorno.
 */

// URL base del backend API
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Solo para mostrar en consola en desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Admin Panel Config:', {
    API_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
}

// Helper para construir URLs de API completas (por si se necesita en el futuro)
export function getApiUrl(path: string): string {
  // Eliminar slash inicial si existe para evitar duplicados
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_URL}/${cleanPath}`;
}

// Headers de autenticación helper
export function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}
