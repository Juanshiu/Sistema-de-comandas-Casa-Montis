'use client';

import { useState, useEffect } from 'react';
import { ComandaHistorial } from '@/types';
import { apiService } from '@/services/api';
import { Calendar, Clock, User, MapPin, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

export default function HistorialComandas() {
  const [comandas, setComandas] = useState<ComandaHistorial[]>([]);
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async (fecha?: string) => {
    try {
      setCargando(true);
      const historial = await apiService.getHistorialComandas(fecha);
      setComandas(historial);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleFiltroFecha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fecha = e.target.value;
    setFiltroFecha(fecha);
    cargarHistorial(fecha);
  };

  const toggleExpansion = (comandaId: string) => {
    const nuevasExpandidas = new Set(expandidas);
    if (nuevasExpandidas.has(comandaId)) {
      nuevasExpandidas.delete(comandaId);
    } else {
      nuevasExpandidas.add(comandaId);
    }
    setExpandidas(nuevasExpandidas);
  };

  const formatearFecha = (fecha: string) => {
    // Crear fecha directamente sin manipulación de zona horaria
    const fechaObj = new Date(fecha);
    
    return fechaObj.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activa':
        return 'bg-green-100 text-green-800';
      case 'pagada':
        return 'bg-blue-100 text-blue-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Historial de Comandas</h1>
        
        {/* Filtro por fecha */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <label htmlFor="fecha-filtro" className="text-sm font-medium text-gray-700">
              Filtrar por fecha:
            </label>
          </div>
          <input
            id="fecha-filtro"
            type="date"
            value={filtroFecha}
            onChange={handleFiltroFecha}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filtroFecha && (
            <button
              onClick={() => {
                setFiltroFecha('');
                cargarHistorial();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Comandas</p>
                <p className="text-2xl font-bold text-gray-900">{comandas.length}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Comandas Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {comandas.filter(c => c.estado === 'pendiente' || c.estado === 'preparando').length}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-full">
                <User className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Ventas</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${comandas.reduce((sum, c) => sum + c.total, 0).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-full">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de comandas */}
      {cargando ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {comandas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay comandas para mostrar</p>
            </div>
          ) : (
            comandas.map((comanda) => (
              <div key={comanda.id} className="bg-white rounded-lg shadow border overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpansion(comanda.id.toString())}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">#{comanda.id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(comanda.estado)}`}>
                          {comanda.estado}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        {comanda.mesero}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {comanda.mesas}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {formatearFecha(comanda.fecha)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          ${comanda.total.toLocaleString('es-CO')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {comanda.items?.length || 0} items
                        </p>
                      </div>
                      
                      {expandidas.has(comanda.id.toString()) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {expandidas.has(comanda.id.toString()) && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Items de la comanda */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Items de la Comanda</h4>
                        <div className="space-y-2">
                          {comanda.items?.map((item, index) => (
                            <div key={index} className="bg-white p-3 rounded border">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {item.cantidad}x {item.producto_nombre}
                                  </p>
                                  
                                  {item.personalizacion && (
                                    <div className="mt-1 text-sm text-gray-600">
                                      {item.personalizacion.caldo && (
                                        <span className="mr-2">Caldo: {item.personalizacion.caldo.nombre}</span>
                                      )}
                                      {item.personalizacion.principio && (
                                        <span className="mr-2">Principio: {item.personalizacion.principio.nombre}</span>
                                      )}
                                      {item.personalizacion.proteina && (
                                        <span className="mr-2">Proteína: {item.personalizacion.proteina.nombre}</span>
                                      )}
                                      {item.personalizacion.bebida && (
                                        <span>Bebida: {item.personalizacion.bebida.nombre}</span>
                                      )}
                                    </div>
                                  )}
                                  
                                  {item.observaciones && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      Obs: {item.observaciones}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="text-right">
                                  <p className="font-medium text-gray-900">
                                    ${item.subtotal.toLocaleString('es-CO')}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    ${item.precio_unitario.toLocaleString('es-CO')} c/u
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Información adicional */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Información Adicional</h4>
                        <div className="bg-white p-3 rounded border space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">${comanda.subtotal.toLocaleString('es-CO')}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-900 font-medium">Total:</span>
                            <span className="font-bold text-lg">${comanda.total.toLocaleString('es-CO')}</span>
                          </div>
                          
                          {comanda.observaciones_generales && (
                            <div className="border-t pt-2">
                              <p className="text-sm text-gray-600">
                                <strong>Observaciones:</strong> {comanda.observaciones_generales}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
