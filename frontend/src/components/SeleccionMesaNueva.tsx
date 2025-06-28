'use client';

import { useState, useEffect } from 'react';
import { Mesa } from '@/types';
import { apiService } from '@/services/api';
import { Users, Check, X } from 'lucide-react';

interface SeleccionMesaProps {
  mesasSeleccionadas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
}

interface MesasPorSalon {
  [salon: string]: Mesa[];
}

export default function SeleccionMesa({ mesasSeleccionadas, onMesasChange }: SeleccionMesaProps) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesasPorSalon, setMesasPorSalon] = useState<MesasPorSalon>({});
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
      
      // Agrupar mesas por salón
      const agrupadas = mesasData.reduce((acc: MesasPorSalon, mesa) => {
        if (!acc[mesa.salon]) {
          acc[mesa.salon] = [];
        }
        acc[mesa.salon].push(mesa);
        return acc;
      }, {});
      
      setMesasPorSalon(agrupadas);
      setError(null);
    } catch (err) {
      setError('Error al cargar las mesas');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMesa = (mesa: Mesa) => {
    if (mesa.ocupada) return; // No permitir seleccionar mesas ocupadas
    
    const yaSeleccionada = mesasSeleccionadas.find(m => m.id === mesa.id);
    
    if (yaSeleccionada) {
      // Remover mesa
      const nuevasMesas = mesasSeleccionadas.filter(m => m.id !== mesa.id);
      onMesasChange(nuevasMesas);
    } else {
      // Agregar mesa
      onMesasChange([...mesasSeleccionadas, mesa]);
    }
  };

  const limpiarSeleccion = () => {
    onMesasChange([]);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-secondary-600">Cargando mesas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Mesa(s)</h2>
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-2 sm:space-y-0">
        <h2 className="text-xl font-semibold text-secondary-800">Seleccionar Mesa(s)</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          {mesasSeleccionadas.length > 0 && (
            <div className="text-sm text-primary-600 font-medium">
              {mesasSeleccionadas.length} mesa(s) seleccionada(s)
            </div>
          )}
          <button
            onClick={limpiarSeleccion}
            disabled={mesasSeleccionadas.length === 0}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar selección
          </button>
        </div>
      </div>

      {/* Lista de mesas seleccionadas */}
      {mesasSeleccionadas.length > 0 && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <h3 className="font-medium text-primary-800 mb-2">Mesas Seleccionadas:</h3>
          <div className="flex flex-wrap gap-2">
            {mesasSeleccionadas.map((mesa) => (
              <div
                key={mesa.id}
                className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border border-primary-300"
              >
                <span className="text-sm font-medium text-primary-700">
                  Mesa {mesa.numero} ({mesa.salon})
                </span>
                <button
                  onClick={() => toggleMesa(mesa)}
                  className="text-primary-500 hover:text-primary-700"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mesas por salón */}
      <div className="space-y-6">
        {Object.entries(mesasPorSalon).map(([salon, mesasSalon]) => (
          <div key={salon}>
            <h3 className="text-lg font-medium text-secondary-700 mb-3 border-b border-secondary-200 pb-2">
              {salon}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {mesasSalon.map((mesa) => {
                const estaSeleccionada = mesasSeleccionadas.find(m => m.id === mesa.id);
                
                return (
                  <button
                    key={mesa.id}
                    onClick={() => toggleMesa(mesa)}
                    disabled={mesa.ocupada}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all duration-200 text-center min-h-[80px] flex flex-col justify-center
                      ${mesa.ocupada 
                        ? 'bg-red-100 border-red-300 text-red-600 cursor-not-allowed opacity-60' 
                        : estaSeleccionada
                          ? 'bg-primary-100 border-primary-500 text-primary-700 shadow-md transform scale-105'
                          : 'bg-white border-secondary-300 text-secondary-700 hover:border-primary-400 hover:bg-primary-50'
                      }
                    `}
                  >
                    {/* Indicador de mesa ocupada */}
                    {mesa.ocupada && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                    )}
                    
                    {/* Indicador de mesa seleccionada */}
                    {estaSeleccionada && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    
                    <div className="font-semibold text-sm mb-1">Mesa {mesa.numero}</div>
                    <div className="flex items-center justify-center space-x-1 text-xs">
                      <Users size={12} />
                      <span>{mesa.capacidad}</span>
                    </div>
                    
                    {mesa.ocupada && (
                      <div className="text-xs mt-1 font-medium">Ocupada</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className="mt-6 flex flex-wrap items-center justify-center space-x-6 text-sm text-secondary-600 border-t border-secondary-200 pt-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-white border-2 border-secondary-300 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-primary-100 border-2 border-primary-500 rounded"></div>
          <span>Seleccionada</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded relative">
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></div>
          </div>
          <span>Ocupada</span>
        </div>
      </div>

      <div className="mt-4 text-xs text-secondary-500 text-center">
        💡 Puedes seleccionar múltiples mesas para grupos grandes
      </div>
    </div>
  );
}
