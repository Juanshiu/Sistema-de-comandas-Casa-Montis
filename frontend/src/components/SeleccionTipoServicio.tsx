'use client';

import { FormularioComanda } from '@/types';

interface SeleccionTipoServicioProps {
  onTipoSelect: (tipo: FormularioComanda['tipo_servicio']) => void;
  tipoSeleccionado?: FormularioComanda['tipo_servicio'];
}

export default function SeleccionTipoServicio({ onTipoSelect, tipoSeleccionado }: SeleccionTipoServicioProps) {
  const tiposServicio = [
    {
      key: 'desayuno' as const,
      nombre: 'Desayunos',
      descripcion: 'Caldos y proteínas (precios especiales)',
      icono: '🌅'
    },
    {
      key: 'almuerzo' as const,
      nombre: 'Almuerzos',
      descripcion: 'Sopa, principio y proteína',
      icono: '🍽️'
    },
    {
      key: 'carta_pechuga' as const,
      nombre: 'Pechugas',
      descripcion: 'Especialidades de pechuga',
      icono: '🍗'
    },
    {
      key: 'carta_carne' as const,
      nombre: 'Carnes',
      descripcion: 'Especialidades de carne',
      icono: '🥩'
    },
    {
      key: 'carta_pasta' as const,
      nombre: 'Pastas',
      descripcion: 'Variedad de pastas',
      icono: '🍝'
    },
    {
      key: 'carta_pescado' as const,
      nombre: 'Pescados',
      descripcion: 'Pescados y mariscos',
      icono: '🐟'
    },
    {
      key: 'carta_arroz' as const,
      nombre: 'Arroces',
      descripcion: 'Diferentes tipos de arroz',
      icono: '🍚'
    },
    {
      key: 'sopa' as const,
      nombre: 'Sopas',
      descripcion: 'Solo sopas y caldos',
      icono: '🍲'
    },
    {
      key: 'bebida' as const,
      nombre: 'Bebidas',
      descripcion: 'Refrescos, jugos y bebidas',
      icono: '🥤'
    },
    {
      key: 'otros' as const,
      nombre: 'Otros',
      descripcion: 'Desechables y varios',
      icono: '📦'
    },
    {
      key: 'cafeteria' as const,
      nombre: 'Cafetería',
      descripcion: 'Postres y productos de cafetería',
      icono: '🍰'
    },
    {
      key: 'porciones' as const,
      nombre: 'Porciones',
      descripcion: 'Porciones adicionales',
      icono: '🍽️'
    }
  ];

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-secondary-800 mb-6">Seleccionar Tipo de Servicio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiposServicio.map((tipo) => (
          <button
            key={tipo.key}
            onClick={() => onTipoSelect(tipo.key)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md
              ${tipoSeleccionado === tipo.key
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : 'border-secondary-300 bg-white hover:border-primary-300'
              }
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{tipo.icono}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-secondary-800 mb-1">
                  {tipo.nombre}
                </h3>
                <p className="text-sm text-secondary-600">
                  {tipo.descripcion}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {tipoSeleccionado && (
        <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <div className="text-sm text-primary-800">
            <strong>Tipo seleccionado:</strong>{' '}
            {tiposServicio.find(t => t.key === tipoSeleccionado)?.nombre}
          </div>
        </div>
      )}
    </div>
  );
}
