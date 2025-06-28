'use client';

import { useState, useEffect } from 'react';
import { Mesa } from '@/types';
import { apiService } from '@/services/api';

interface SeleccionMesaProps {
  onMesaSelect: (mesa: Mesa) => void;
  mesaSeleccionada?: Mesa;
}

export default function SeleccionMesa({ onMesaSelect, mesaSeleccionada }: SeleccionMesaProps) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarMesas();
  }, []);

  const cargarMesas = async () => {
    try {
      setLoading(true);
      const mesasData = await apiService.getMesas();
      setMesas(mesasData);
      setError(null);
    } catch (err) {
      setError('Error al cargar las mesas');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Mesa</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Mesa</h2>
        <div className="text-red-600 text-center py-4">
          {error}
          <button 
            onClick={cargarMesas}
            className="block mx-auto mt-2 btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Mesa</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {mesas.map((mesa) => (
          <button
            key={mesa.id}
            onClick={() => onMesaSelect(mesa)}
            className={`
              relative p-4 rounded-lg border-2 transition-all duration-200 min-h-[80px]
              ${mesaSeleccionada?.id === mesa.id
                ? 'border-primary-500 bg-primary-50 shadow-md'
                : mesa.ocupada
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-secondary-300 bg-white hover:border-primary-300 hover:bg-primary-25'
              }
            `}
            disabled={mesa.ocupada && mesaSeleccionada?.id !== mesa.id}
          >
            <div className="text-center">
              <div className="font-semibold text-lg">{mesa.numero}</div>
              <div className="text-sm text-secondary-600">
                Cap: {mesa.capacidad}
              </div>
              {mesa.ocupada && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {mesaSeleccionada && (
        <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
          <div className="text-sm text-primary-800">
            <strong>Mesa seleccionada:</strong> {mesaSeleccionada.numero} 
            (Capacidad: {mesaSeleccionada.capacidad} personas)
          </div>
        </div>
      )}
    </div>
  );
}
