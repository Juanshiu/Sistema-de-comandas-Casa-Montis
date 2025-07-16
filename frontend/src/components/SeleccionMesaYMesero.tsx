'use client';

import { useState, useEffect } from 'react';
import { Mesa, Comanda } from '@/types';
import { apiService } from '@/services/api';
import { Users, Check, X, User, Edit, Clock, AlertCircle } from 'lucide-react';

interface SeleccionMesaProps {
  mesasSeleccionadas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
  mesero: string;
  onMeseroChange: (mesero: string) => void;
  onEditarComanda?: (comanda: Comanda) => void;
}

interface MesasPorSalon {
  [salon: string]: Mesa[];
}

export default function SeleccionMesaYMesero({ mesasSeleccionadas, onMesasChange, mesero, onMeseroChange, onEditarComanda }: SeleccionMesaProps) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesasPorSalon, setMesasPorSalon] = useState<MesasPorSalon>({});
  const [comandasActivas, setComandasActivas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarMesas();
    cargarComandasActivas();
    // Cargar el nombre del mesero guardado al inicializar
    cargarMeseroGuardado();
  }, []);

  const cargarComandasActivas = async () => {
    try {
      const comandas = await apiService.getComandasActivas();
      setComandasActivas(comandas);
    } catch (err) {
      console.error('Error al cargar comandas activas:', err);
    }
  };

  const cargarMeseroGuardado = () => {
    try {
      const meseroGuardado = localStorage.getItem('casa-montis-mesero');
      if (meseroGuardado && !mesero) {
        onMeseroChange(meseroGuardado);
      }
    } catch (error) {
      console.error('Error al cargar mesero guardado:', error);
    }
  };

  const handleMeseroChange = (nuevoMesero: string) => {
    onMeseroChange(nuevoMesero);
    // Guardar en localStorage
    try {
      if (nuevoMesero.trim()) {
        localStorage.setItem('casa-montis-mesero', nuevoMesero.trim());
      } else {
        localStorage.removeItem('casa-montis-mesero');
      }
    } catch (error) {
      console.error('Error al guardar mesero:', error);
    }
  };

  const cargarMesas = async () => {
    try {
      setLoading(true);
      const mesasData = await apiService.getMesas();
      setMesas(mesasData);
      
      // Agrupar mesas por salón y ordenar cada grupo
      const agrupadas = mesasData.reduce((acc: MesasPorSalon, mesa) => {
        if (!acc[mesa.salon]) {
          acc[mesa.salon] = [];
        }
        acc[mesa.salon].push(mesa);
        return acc;
      }, {});
      
      // Ordenar las mesas dentro de cada salón
      Object.keys(agrupadas).forEach(salon => {
        agrupadas[salon].sort((a, b) => {
          // Intentar ordenar numéricamente primero
          const numA = parseInt(a.numero);
          const numB = parseInt(b.numero);
          
          // Si ambos son números válidos, ordenar numéricamente
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          
          // Si uno es número y otro no, el número va primero
          if (!isNaN(numA) && isNaN(numB)) return -1;
          if (isNaN(numA) && !isNaN(numB)) return 1;
          
          // Si ninguno es número, ordenar alfabéticamente
          return a.numero.localeCompare(b.numero);
        });
      });
      
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
    if (mesa.ocupada) return;
    
    const mesaYaSeleccionada = mesasSeleccionadas.find(m => m.id === mesa.id);
    
    if (mesaYaSeleccionada) {
      // Remover mesa de la selección
      onMesasChange(mesasSeleccionadas.filter(m => m.id !== mesa.id));
    } else {
      // Agregar mesa a la selección
      onMesasChange([...mesasSeleccionadas, mesa]);
    }
  };

  const limpiarSeleccion = () => {
    onMesasChange([]);
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Mesa(s) y Mesero</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Mesa(s) y Mesero</h2>
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
    <div className="space-y-6">
      {/* Comandas Activas para Editar */}
      {comandasActivas.length > 0 && onEditarComanda && (
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4 flex items-center">
            <Edit className="mr-2" size={20} />
            Comandas Activas para Editar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comandasActivas.map((comanda) => (
              <div
                key={comanda.id}
                className="border rounded-lg p-4 bg-white hover:bg-secondary-25 transition-colors cursor-pointer"
                onClick={() => onEditarComanda(comanda)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-secondary-800">
                      {comanda.mesas.map(m => `${m.salon} - ${m.numero}`).join(', ')}
                    </h3>
                    <p className="text-sm text-secondary-600">
                      Mesero: {comanda.mesero}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                    comanda.estado === 'preparando' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {comanda.estado === 'preparando' ? <AlertCircle size={12} /> : <Check size={12} />}
                    <span className="capitalize">{comanda.estado}</span>
                  </div>
                </div>
                <div className="text-sm text-secondary-600 mb-2">
                  {comanda.items?.length || 0} item(s)
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-primary-600">
                    ${comanda.total.toLocaleString()}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                    <Edit size={14} className="mr-1" />
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campo de Mesero */}
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4 flex items-center">
          <User className="mr-2" size={20} />
          Información del Mesero
        </h2>
        <div className="max-w-md">
          <label htmlFor="mesero" className="block text-sm font-medium text-secondary-700 mb-2">
            Nombre del Mesero/a
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="mesero"
              value={mesero}
              onChange={(e) => handleMeseroChange(e.target.value)}
              placeholder="Ingrese el nombre del mesero/a"
              className="flex-1 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {mesero && (
              <button
                onClick={() => handleMeseroChange('')}
                className="px-3 py-2 bg-secondary-200 hover:bg-secondary-300 text-secondary-700 rounded-md text-sm transition-colors"
                title="Limpiar mesero"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {mesero && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Mesero guardado automáticamente
            </p>
          )}
          <p className="text-xs text-secondary-500 mt-1">
            El nombre se guardará automáticamente en este dispositivo
          </p>
        </div>
      </div>

      {/* Selección de Mesas */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-secondary-800 flex items-center">
            <Users className="mr-2" size={20} />
            Seleccionar Mesa(s)
          </h2>
          {mesasSeleccionadas.length > 0 && (
            <button
              onClick={limpiarSeleccion}
              className="text-sm text-red-600 hover:text-red-800 flex items-center"
            >
              <X size={16} className="mr-1" />
              Limpiar selección
            </button>
          )}
        </div>

        <div className="space-y-6">
          {Object.entries(mesasPorSalon).map(([salon, mesasSalon]) => (
            <div key={salon} className="border rounded-lg p-4 bg-secondary-25">
              <h3 className="font-semibold text-lg text-secondary-800 mb-3 border-b pb-2">
                {salon}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {mesasSalon.map((mesa) => {
                  const mesaSeleccionada = mesasSeleccionadas.find(m => m.id === mesa.id);
                  
                  return (
                    <button
                      key={mesa.id}
                      onClick={() => toggleMesa(mesa)}
                      className={`
                        relative p-3 rounded-lg border-2 transition-all duration-200 min-h-[70px]
                        ${mesaSeleccionada
                          ? 'border-primary-500 bg-primary-50 shadow-md'
                          : mesa.ocupada
                          ? 'border-red-300 bg-red-50 text-red-700 cursor-not-allowed'
                          : 'border-secondary-300 bg-white hover:border-primary-300 hover:bg-primary-25'
                        }
                      `}
                      disabled={mesa.ocupada}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm md:text-base">{mesa.numero}</div>
                        <div className="text-xs text-secondary-600">
                          Cap: {mesa.capacidad}
                        </div>
                        {mesa.ocupada && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                        {mesaSeleccionada && (
                          <div className="absolute top-1 right-1">
                            <Check size={16} className="text-primary-600" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {mesasSeleccionadas.length > 0 && (
          <div className="mt-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
            <div className="text-sm text-primary-800">
              <div className="font-semibold mb-2">
                Mesa(s) seleccionada(s): {mesasSeleccionadas.length}
              </div>
              <div className="flex flex-wrap gap-2">
                {mesasSeleccionadas.map((mesa) => (
                  <span
                    key={mesa.id}
                    className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 rounded-md text-xs"
                  >
                    {mesa.salon} - {mesa.numero}
                    <button
                      onClick={() => toggleMesa(mesa)}
                      className="ml-1 hover:text-primary-600"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 text-xs text-primary-600">
                Capacidad total: {mesasSeleccionadas.reduce((sum, mesa) => sum + mesa.capacidad, 0)} personas
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
