'use client';

import { useState } from 'react';
import { Settings, Package, Utensils, Coffee, Users, Home, Tags } from 'lucide-react';
import GestionProductos from './admin/GestionProductos';
import GestionCategorias from './admin/GestionCategorias';
import GestionPersonalizaciones from './admin/GestionPersonalizaciones';
import GestionMesas from './admin/GestionMesas';
import GestionSalones from './admin/GestionSalones';

type SeccionAdmin = 'productos' | 'categorias' | 'personalizaciones' | 'mesas' | 'salones';

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
              <Settings className="h-6 w-6 text-primary-600 mr-2" />
              <h1 className="text-xl font-bold text-secondary-800">
                Administración - Casa Montis
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {secciones.map((seccion) => {
              const Icon = seccion.icon;
              return (
                <button
                  key={seccion.id}
                  onClick={() => setSeccionActiva(seccion.id)}
                  className={`
                    flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors
                    ${seccionActiva === seccion.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                    }
                  `}
                >
                  <Icon size={16} className="mr-2" />
                  {seccion.nombre}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderSeccion()}
      </div>
    </div>
  );
}
