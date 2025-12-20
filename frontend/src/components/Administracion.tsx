'use client';

import { useState } from 'react';
import { Settings, Package, Tags, Utensils, Users, Home, Shield } from 'lucide-react';
import GestionProductos from './admin/GestionProductos';
import GestionCategorias from './admin/GestionCategorias';
import GestionPersonalizaciones from './admin/GestionPersonalizaciones';
import GestionMesas from './admin/GestionMesas';
import GestionSalones from './admin/GestionSalones';
import ConfiguracionSistema from './admin/ConfiguracionSistema';

type SeccionAdmin = 'productos' | 'categorias' | 'personalizaciones' | 'mesas' | 'salones' | 'sistema';

export default function Administracion() {
  const [seccionActiva, setSeccionActiva] = useState<SeccionAdmin>('productos');

  const secciones = [
    {
      id: 'productos' as SeccionAdmin,
      nombre: 'Gestión de Productos',
      icon: Package,
      descripcion: 'Crear, editar y eliminar productos del menú'
    },
    {
      id: 'categorias' as SeccionAdmin,
      nombre: 'Gestión de Categorías',
      icon: Tags,
      descripcion: 'Administrar categorías de productos'
    },
    {
      id: 'personalizaciones' as SeccionAdmin,
      nombre: 'Personalizaciones',
      icon: Utensils,
      descripcion: 'Gestionar opciones de caldos, principios y proteínas'
    },
    {
      id: 'mesas' as SeccionAdmin,
      nombre: 'Gestión de Mesas',
      icon: Users,
      descripcion: 'Crear, editar y eliminar mesas del restaurante'
    },
    {
      id: 'salones' as SeccionAdmin,
      nombre: 'Gestión de Salones',
      icon: Home,
      descripcion: 'Crear, editar y eliminar salones del restaurante'
    },
    {
      id: 'sistema' as SeccionAdmin,
      nombre: 'Configuración del Sistema',
      icon: Shield,
      descripcion: 'Herramientas avanzadas y configuración del sistema'
    }
  ];

  const renderSeccion = () => {
    switch (seccionActiva) {
      case 'productos':
        return <GestionProductos />;
      case 'categorias':
        return <GestionCategorias />;
      case 'personalizaciones':
        return <GestionPersonalizaciones />;
      case 'mesas':
        return <GestionMesas />;
      case 'salones':
        return <GestionSalones />;
      case 'sistema':
        return <ConfiguracionSistema />;
      default:
        return <GestionProductos />;
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Settings className="h-5 w-5 md:h-6 md:w-6 text-primary-600 mr-2" />
              <h1 className="text-sm md:text-xl font-bold text-secondary-800">
                Administración - Casa Montis
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b overflow-x-auto xl:overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 lg:space-x-4 min-w-max">
            {secciones.map((seccion) => {
              const Icon = seccion.icon;
              const isSystem = seccion.id === 'sistema';
              return (
                <button
                  key={seccion.id}
                  onClick={() => setSeccionActiva(seccion.id)}
                  className={`
                    flex items-center px-2 md:px-3 py-4 text-xs md:text-sm font-medium border-b-2 transition-colors text-justify
                    ${seccionActiva === seccion.id
                      ? isSystem 
                        ? 'border-red-500 text-red-600'
                        : 'border-primary-500 text-primary-600'
                      : isSystem
                        ? 'border-transparent text-red-400 hover:text-red-600 hover:border-red-300'
                        : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                    }
                  `}
                >
                  <Icon size={14} className="mr-1 md:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">{seccion.nombre}</span>
                  <span className="sm:hidden">{seccion.nombre.split(' ').pop()}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
        {renderSeccion()}
      </div>
    </div>
  );
}
