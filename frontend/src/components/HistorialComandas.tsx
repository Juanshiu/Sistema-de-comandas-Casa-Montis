'use client';

import { useState, useEffect } from 'react';
import { ComandaHistorial } from '@/types';
import { apiService } from '@/services/api';
import { Calendar, Clock, User, MapPin, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { usePersonalizaciones } from '@/components/shared';

export default function HistorialComandas() {
  const [comandas, setComandas] = useState<ComandaHistorial[]>([]);
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [comandasVisibles, setComandasVisibles] = useState(20);
  const { categorias: categoriasPersonalizacion, itemsPorCategoria: itemsPersonalizacion, ordenarPersonalizaciones } = usePersonalizaciones();
  const [configFacturacion, setConfigFacturacion] = useState<any>(null);

  useEffect(() => {
    cargarHistorial();
    cargarConfiguracionFacturacion();
  }, []);

  const cargarConfiguracionFacturacion = async () => {
    try {
      const config = await apiService.getConfiguracionFacturacion();
      setConfigFacturacion(config);
    } catch (err) {
      console.error('Error al cargar configuración de facturación:', err);
    }
  };

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
    setComandasVisibles(20); // Reiniciar a 20 cuando se filtra
    cargarHistorial(fecha);
  };

  const cargarMasComandas = () => {
    setComandasVisibles(prev => prev + 20);
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

  const calcularDesgloseIVA = (total: number) => {
    if (!configFacturacion || !configFacturacion.responsable_iva || !configFacturacion.porcentaje_iva) {
      return { subtotal: total, iva: 0, total };
    }
    
    const subtotal = total / (1 + configFacturacion.porcentaje_iva / 100);
    const iva = total - subtotal;
    return { subtotal, iva, total };
  };

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-50 border border-yellow-400 text-yellow-700';
      case 'preparando':
        return 'bg-orange-50 border border-orange-400 text-orange-700';
      case 'lista':
        return 'bg-green-50 border border-green-500 text-green-700';
      case 'entregada':
        return 'bg-teal-50 border border-teal-400 text-teal-700';
      case 'facturada':
        return 'bg-blue-50 border border-blue-500 text-blue-700';
      case 'cancelada':
        return 'bg-red-50 border border-red-500 text-red-700';
      default:
        return 'bg-gray-50 border border-gray-400 text-gray-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
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
                setComandasVisibles(20);
                cargarHistorial();
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Limpiar filtro
            </button>
          )}
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
          
          {/* <div className="bg-white p-4 rounded-lg shadow border">
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
          </div> */}
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
            comandas.slice(0, comandasVisibles).map((comanda, index) => (
              <div key={comanda.id} className="bg-white rounded-lg shadow border overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpansion(comanda.id.toString())}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">#{comandas.length - index}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(comanda.estado)}`}>
                          {comanda.estado.charAt(0).toUpperCase() + comanda.estado.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        {comanda.mesero}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {comanda.tipo_pedido === 'domicilio' 
                          ? comanda.datos_cliente?.es_para_llevar 
                            ? 'Para Llevar'
                            : 'Domicilio'
                          : Array.isArray(comanda.mesas) && comanda.mesas.length > 0
                            ? comanda.mesas.map(m => `${m.salon}, ${m.numero}`).join(', ')
                            : 'N/A'
                        }
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {formatearFecha(comanda.fecha_creacion?.toString() || new Date().toString())}
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
                                    {item.cantidad}x {item.producto?.nombre || 'Producto'}
                                  </p>
                                  
                                  {item.personalizacion && Object.keys(item.personalizacion).length > 0 && (
                                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                                      {(() => {
                                        // Ordenar las entradas según el orden de las categorías
                                        const entradasOrdenadas = ordenarPersonalizaciones(item.personalizacion);
                                        
                                        return entradasOrdenadas.map(([key, value]) => {
                                          const categoriaId = parseInt(key);
                                          const itemId = value as number;
                                          
                                          const categoria = categoriasPersonalizacion.find((c: any) => c.id === categoriaId);
                                          if (!categoria) return null;
                                          
                                          const itemsDeCategoria = itemsPersonalizacion[categoriaId] || [];
                                          const itemSeleccionado = itemsDeCategoria.find((it: any) => it.id === itemId);
                                          
                                          if (!itemSeleccionado) return null;
                                          
                                          return (
                                            <div key={key} className="flex items-center gap-1">
                                              <span className="font-medium">{categoria.nombre}:</span>
                                              <span>{itemSeleccionado.nombre}</span>
                                            </div>
                                          );
                                        });
                                      })()}
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
                          {(() => {
                            const desglose = calcularDesgloseIVA(comanda.total);
                            return (
                              <>
                                {configFacturacion?.responsable_iva && configFacturacion.porcentaje_iva ? (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Subtotal:</span>
                                      <span className="font-medium">${Math.round(desglose.subtotal).toLocaleString('es-CO')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">IVA ({configFacturacion.porcentaje_iva}%):</span>
                                      <span className="font-medium">${Math.round(desglose.iva).toLocaleString('es-CO')}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                      <span className="text-gray-900 font-medium">Total:</span>
                                      <span className="font-bold text-lg">${comanda.total.toLocaleString('es-CO')}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Subtotal:</span>
                                      <span className="font-medium">${comanda.subtotal.toLocaleString('es-CO')}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                      <span className="text-gray-900 font-medium">Total:</span>
                                      <span className="font-bold text-lg">${comanda.total.toLocaleString('es-CO')}</span>
                                    </div>
                                  </>
                                )}
                              </>
                            );
                          })()}
                          
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

      {/* Botón Ver más */}
      {!cargando && comandas.length > comandasVisibles && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={cargarMasComandas}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-2"
          >
            <ChevronDown className="w-5 h-5" />
            Ver más comandas ({comandas.length - comandasVisibles} restantes)
          </button>
        </div>
      )}

      {/* Mensaje cuando se muestran todas */}
      {!cargando && comandas.length > 0 && comandasVisibles >= comandas.length && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Mostrando todas las comandas ({comandas.length})
          </p>
        </div>
      )}
    </div>
  );
}
