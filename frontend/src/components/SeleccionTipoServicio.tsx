'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { getIconoPorCategoria } from '@/utils/personalizacionUtils';

interface SeleccionTipoServicioProps {
  onTipoSelect: (tipo: string) => void;
  tipoSeleccionado?: string;
}

/**
 * Genera una descripción sugerida basada en el nombre de la categoría
 */
const getDescripcionPorCategoria = (nombre: string): string => {
  const nombreLower = nombre.toLowerCase();
  
  if (nombreLower.includes('desayuno')) return 'Caldos y proteínas';
  if (nombreLower.includes('almuerzo')) return 'Sopa, principio y proteína';
  if (nombreLower.includes('pechuga')) return 'Especialidades de pechuga';
  if (nombreLower.includes('carne')) return 'Especialidades de carne';
  if (nombreLower.includes('pasta')) return 'Variedad de pastas';
  if (nombreLower.includes('pescado')) return 'Pescados y mariscos';
  if (nombreLower.includes('arroz')) return 'Diferentes tipos de arroz';
  if (nombreLower.includes('sopa')) return 'Sopas y caldos';
  if (nombreLower.includes('bebida')) return 'Refrescos, jugos y bebidas';
  if (nombreLower.includes('cafeteria')) return 'Postres y cafetería';
  if (nombreLower.includes('porcion')) return 'Porciones adicionales';
  if (nombreLower.includes('otro')) return 'Desechables y varios';
  
  return `Productos de ${nombre.toLowerCase()}`;
};

export default function SeleccionTipoServicio({ onTipoSelect, tipoSeleccionado }: SeleccionTipoServicioProps) {
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const categoriasData = await apiService.getCategorias();
      setCategorias(categoriasData);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-6">Seleccionar Tipo de Servicio</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-secondary-800 mb-6">Seleccionar Tipo de Servicio</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {categorias.map((categoria) => {
          const icono = getIconoPorCategoria(categoria);
          const descripcion = getDescripcionPorCategoria(categoria);
          
          return (
            <button
              key={categoria}
              onClick={() => onTipoSelect(categoria)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md
                ${tipoSeleccionado === categoria
                  ? 'border-primary-500 bg-primary-50 shadow-md'
                  : 'border-secondary-300 bg-white hover:border-primary-300'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{icono}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-800 mb-1 capitalize">
                    {categoria.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-secondary-600">
                    {descripcion}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {tipoSeleccionado && (
        <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <div className="text-sm text-primary-800">
            <strong>Tipo seleccionado:</strong>{' '}
            <span className="capitalize">{tipoSeleccionado.replace(/_/g, ' ')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
