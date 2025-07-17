'use client';

import { useState } from 'react';
import FormularioComandas from '@/components/FormularioComandas';
import InterfazCaja from '@/components/InterfazCaja';
import Reportes from '@/components/Reportes';
import Administracion from '@/components/Administracion';
import HistorialComandas from '@/components/HistorialComandas';
import { ShoppingCart, Calculator, BarChart3, Settings, Menu, X, History } from 'lucide-react';

type Vista = 'comandas' | 'caja' | 'reportes' | 'admin' | 'historial';

export default function SistemaPrincipal() {
  const [vistaActual, setVistaActual] = useState<Vista>('comandas');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const vistas = [
    {
      id: 'comandas' as Vista,
      nombre: 'Tomar Comandas',
      icon: ShoppingCart,
      descripcion: 'Crear nuevas comandas'
    },
    {
      id: 'caja' as Vista,
      nombre: 'Caja',
      icon: Calculator,
      descripcion: 'Procesar pagos y liberar mesas'
    },
    {
      id: 'historial' as Vista,
      nombre: 'Historial',
      icon: History,
      descripcion: 'Ver historial de comandas'
    },
    {
      id: 'reportes' as Vista,
      nombre: 'Reportes',
      icon: BarChart3,
      descripcion: 'Ver estadísticas de ventas'
    },
    {
      id: 'admin' as Vista,
      nombre: 'Administración',
      icon: Settings,
      descripcion: 'Gestionar productos y personalizaciones'
    }
  ];

  const renderVista = () => {
    switch (vistaActual) {
      case 'comandas':
        return <FormularioComandas />;
      case 'caja':
        return <InterfazCaja />;
      case 'historial':
        return <HistorialComandas />;
      case 'reportes':
        return <Reportes />;
      case 'admin':
        return <Administracion />;
      default:
        return <FormularioComandas />;
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-secondary-800">
                Casa Montis - Sistema de Comandas
              </h1>
            </div>
            
            {/* Navegación desktop */}
            <nav className="hidden md:flex space-x-8">
              {vistas.map((vista) => {
                const Icon = vista.icon;
                return (
                  <button
                    key={vista.id}
                    onClick={() => setVistaActual(vista.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      vistaActual === vista.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{vista.nombre}</span>
                  </button>
                );
              })}
            </nav>

            {/* Botón menú móvil */}
            <div className="md:hidden">
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="text-secondary-600 hover:text-secondary-900 p-2"
              >
                {menuAbierto ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Menú móvil */}
        {menuAbierto && (
          <div className="md:hidden border-t bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {vistas.map((vista) => {
                const Icon = vista.icon;
                return (
                  <button
                    key={vista.id}
                    onClick={() => {
                      setVistaActual(vista.id);
                      setMenuAbierto(false);
                    }}
                    className={`flex items-center space-x-3 w-full px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      vistaActual === vista.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                    }`}
                  >
                    <Icon size={20} />
                    <div className="text-left">
                      <div>{vista.nombre}</div>
                      <div className="text-xs text-secondary-500">{vista.descripcion}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Indicador de vista actual */}
      <div className="bg-primary-600 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2">
            {(() => {
              const vistaActiva = vistas.find(v => v.id === vistaActual);
              if (vistaActiva) {
                const Icon = vistaActiva.icon;
                return (
                  <>
                    <Icon size={16} />
                    <span className="text-sm font-medium">{vistaActiva.nombre}</span>
                    <span className="text-primary-200">•</span>
                    <span className="text-sm text-primary-200">{vistaActiva.descripcion}</span>
                  </>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderVista()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-secondary-500">
            Casa Montis - Sistema de Comandas v1.0 © 2024
          </div>
        </div>
      </footer>
    </div>
  );
}
