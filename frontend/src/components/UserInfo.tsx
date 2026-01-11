'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Shield, Clock } from 'lucide-react';

export default function UserInfo() {
  const { usuario, logout } = useAuth();
  const [horaActual, setHoraActual] = useState('');
  const [mostrarMenu, setMostrarMenu] = useState(false);

  // Actualizar hora cada segundo (zona horaria de Colombia: America/Bogota - UTC-5)
  useEffect(() => {
    const actualizarHora = () => {
      const ahora = new Date();
      // Formatear hora en zona horaria de Colombia
      const horaFormateada = ahora.toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setHoraActual(horaFormateada);
    };

    actualizarHora();
    const intervalo = setInterval(actualizarHora, 1000);

    return () => clearInterval(intervalo);
  }, []);

  const handleLogout = async () => {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout();
    }
  };

  if (!usuario) {
    return null;
  }

  return (
    <div className="relative">
      {/* Botón de usuario */}
      <button
        onClick={() => setMostrarMenu(!mostrarMenu)}
        className="flex items-center space-x-3 px-4 py-2 bg-white border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors shadow-sm"
      >
        <div className="flex items-center space-x-2">
          <div className="bg-primary-100 p-2 rounded-full">
            <User className="w-4 h-4 text-primary-700" />
          </div>
          <div className="text-left block">
            <p className="text-sm font-semibold text-secondary-800 leading-tight">
              {usuario.nombre_completo}
            </p>
            <p className="text-xs text-secondary-500 leading-tight">
              {usuario.rol_nombre}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 border-l border-secondary-200 pl-3">
          <Clock className="w-4 h-4 text-secondary-500" />
          <span className="text-sm font-medium text-secondary-700">
            {horaActual}
          </span>
        </div>
      </button>

      {/* Menú desplegable */}
      {mostrarMenu && (
        <>
          {/* Overlay para cerrar el menú al hacer click afuera */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMostrarMenu(false)}
          />
          
          {/* Menú */}
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-secondary-200 z-20">
            <div className="p-4 border-b border-secondary-200">
              <div className="flex items-start space-x-3">
                <div className="bg-primary-100 p-3 rounded-full">
                  <User className="w-6 h-6 text-primary-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-secondary-800">
                    {usuario.nombre_completo}
                  </p>
                  <p className="text-sm text-secondary-600">
                    {usuario.usuario}
                  </p>
                  <div className="mt-2 inline-flex items-center space-x-1 px-2 py-1 bg-primary-50 rounded-md">
                    <Shield className="w-3 h-3 text-primary-600" />
                    <span className="text-xs font-medium text-primary-700">
                      {usuario.rol_nombre}
                    </span>
                    {usuario.es_superusuario && (
                      <span className="ml-1 text-xs font-bold text-primary-800">
                        (Superusuario)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 rounded-lg transition-colors group"
              >
                <LogOut className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-600">
                  Cerrar Sesión
                </span>
              </button>
            </div>

            {/* Hora actual - Colombia */}
            <div className="px-4 py-3 bg-secondary-50 border-t border-secondary-200 rounded-b-lg">
              <div className="flex items-center justify-center space-x-2 text-secondary-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  <span className="font-medium">{horaActual}</span>
                  <span className="ml-2 text-xs">(Colombia)</span>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
