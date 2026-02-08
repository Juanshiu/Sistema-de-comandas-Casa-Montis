'use client';

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { Mesa, Comanda } from '@/types';
import { apiService } from '@/services/api';
import { Users, Check, X, User, Edit, Clock, AlertCircle, Repeat, Merge } from 'lucide-react';

interface SeleccionMesaProps {
  mesasSeleccionadas: Mesa[];
  onMesasChange: (mesas: Mesa[]) => void;
  onEditarComanda?: (comanda: Comanda) => void;
}

interface MesasPorSalon {
  [salon: string]: Mesa[];
}

export default function SeleccionMesaYMesero({ mesasSeleccionadas, onMesasChange, onEditarComanda }: SeleccionMesaProps) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesasPorSalon, setMesasPorSalon] = useState<MesasPorSalon>({});
  const [comandasActivas, setComandasActivas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para cambio de mesa
  const [mostrarModalCambioMesa, setMostrarModalCambioMesa] = useState(false);
  const [comandaCambiandoMesa, setComandaCambiandoMesa] = useState<Comanda | null>(null);
  const [mesasSeleccionadasCambio, setMesasSeleccionadasCambio] = useState<Mesa[]>([]);
  const [cambiandoMesa, setCambiandoMesa] = useState(false);
  const [errorCambioMesa, setErrorCambioMesa] = useState<string | null>(null);

  // Estados para combinar comandas
  const [mostrarModalCombine, setMostrarModalCombine] = useState(false);
  const [comandaDestinoCombine, setComandaDestinoCombine] = useState<Comanda | null>(null);
  const [comandaOrigenCombine, setComandaOrigenCombine] = useState<Comanda | null>(null);
  const [combinandoComandas, setCombinandoComandas] = useState(false);
  const [errorCombine, setErrorCombine] = useState<string | null>(null);
  
  // Ref para preservar posición del scroll
  const scrollPosRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  
  // Guardar posición del scroll continuamente
  useEffect(() => {
    const handleScroll = () => {
      scrollPosRef.current = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Restaurar scroll después de actualizaciones (pero NO en la primera carga)
  useLayoutEffect(() => {
    if (!isFirstLoadRef.current && !loading) {
      // Solo restaurar si no estamos en estado de carga
      window.scrollTo(0, scrollPosRef.current);
    }
    if (isFirstLoadRef.current && !loading) {
      isFirstLoadRef.current = false;
    }
  }, [mesas, comandasActivas, loading]);

  useEffect(() => {
    cargarMesas();
    cargarComandasActivas();
    
    // Actualizar cada 5 segundos para tiempo real
    const interval = setInterval(() => {
      cargarMesas();
      cargarComandasActivas();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const cargarComandasActivas = async () => {
    try {
      const comandas = await apiService.getComandasActivas();
      setComandasActivas(comandas);
    } catch (err) {
      console.error('Error al cargar comandas activas:', err);
    }
  };

  const parseDatosCliente = (comanda: Comanda) => {
    const raw = (comanda as any).datos_cliente;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  };

  const getNombreCliente = (comanda: Comanda) => {
    const datosCliente = parseDatosCliente(comanda);
    return datosCliente?.nombre || (comanda as any).cliente_nombre || 'Cliente';
  };

  const esParaLlevar = (comanda: Comanda) => {
    const datosCliente = parseDatosCliente(comanda);
    return comanda.tipo_pedido === 'llevar' || (comanda.tipo_pedido === 'domicilio' && datosCliente?.es_para_llevar);
  };

  // Funcion cargarComandasActivas...

  // Optimizar agrupación de mesas con useMemo
  const mesasAgrupadasYOrdenadas = useMemo(() => {
    const agrupadas = mesas.reduce((acc: MesasPorSalon, mesa) => {
      if (!acc[mesa.salon]) {
        acc[mesa.salon] = [];
      }
      acc[mesa.salon].push(mesa);
      return acc;
    }, {});
    
    // Ordenar las mesas dentro de cada salón
    Object.keys(agrupadas).forEach(salon => {
      agrupadas[salon].sort((a, b) => {
        const numA = parseInt(a.numero);
        const numB = parseInt(b.numero);
        
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        
        if (!isNaN(numA) && isNaN(numB)) return -1;
        if (isNaN(numA) && !isNaN(numB)) return 1;
        
        return a.numero.localeCompare(b.numero);
      });
    });
    
    return agrupadas;
  }, [mesas]);

  const cargarMesas = async () => {
    try {
      // Solo cambiar loading en la primera carga
      if (isFirstLoadRef.current) {
        setLoading(true);
      }
      const [mesasData, salonesData] = await Promise.all([
        apiService.getMesas(),
        apiService.getSalones()
      ]);
      
      // Filtrar solo mesas de salones activos
      const salonesActivos = salonesData.filter((salon: any) => salon.activo);
      const idsSalonesActivos = salonesActivos.map((s: any) => s.id);
      
      const mesasFiltradas = mesasData.filter((mesa: Mesa) => 
        !mesa.salon_id || idsSalonesActivos.includes(mesa.salon_id)
      );
      
      setMesas(mesasFiltradas);
      setError(null);
    } catch (err) {
      setError('Error al cargar las mesas');
      console.error('Error:', err);
    } finally {
      if (isFirstLoadRef.current) {
        setLoading(false);
      }
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

  // Funciones para cambio de mesa
  const iniciarCambioMesa = (comanda: Comanda) => {
    setComandaCambiandoMesa(comanda);
    setMesasSeleccionadasCambio([]);
    setErrorCambioMesa(null);
    setMostrarModalCambioMesa(true);
  };

  const cancelarCambioMesa = () => {
    setMostrarModalCambioMesa(false);
    setComandaCambiandoMesa(null);
    setMesasSeleccionadasCambio([]);
    setErrorCambioMesa(null);
  };

  const toggleMesaCambio = (mesa: Mesa) => {
    if (mesa.ocupada) return;
    
    const mesaYaSeleccionada = mesasSeleccionadasCambio.find(m => m.id === mesa.id);
    
    if (mesaYaSeleccionada) {
      setMesasSeleccionadasCambio(mesasSeleccionadasCambio.filter(m => m.id !== mesa.id));
    } else {
      setMesasSeleccionadasCambio([...mesasSeleccionadasCambio, mesa]);
    }
  };

  const confirmarCambioMesa = async () => {
    if (!comandaCambiandoMesa || mesasSeleccionadasCambio.length === 0) {
      setErrorCambioMesa('Debe seleccionar al menos una mesa');
      return;
    }

    try {
      setCambiandoMesa(true);
      setErrorCambioMesa(null);

      await apiService.cambiarMesaComanda(comandaCambiandoMesa.id, mesasSeleccionadasCambio);
      
      // Recargar datos
      await cargarMesas();
      await cargarComandasActivas();
      
      // Cerrar modal
      cancelarCambioMesa();
      
      // Mostrar mensaje de éxito (opcional, puedes agregar un toast)
      console.log('✅ Mesa cambiada exitosamente');
    } catch (error: any) {
      console.error('Error al cambiar mesa:', error);
      setErrorCambioMesa(error.response?.data?.error || 'Error al cambiar la mesa');
    } finally {
      setCambiandoMesa(false);
    }
  };

  // Funciones para combinar comandas
  const iniciarCombinarComanda = (comandaDestino: Comanda) => {
    setComandaDestinoCombine(comandaDestino);
    setComandaOrigenCombine(null);
    setErrorCombine(null);
    setMostrarModalCombine(true);
  };

  const cancelarCombinarComanda = () => {
    setMostrarModalCombine(false);
    setComandaDestinoCombine(null);
    setComandaOrigenCombine(null);
    setErrorCombine(null);
  };

  const confirmarCombinacion = async () => {
    if (!comandaDestinoCombine || !comandaOrigenCombine) {
      setErrorCombine('Debe seleccionar la comanda que desea fusionar');
      return;
    }

    try {
      setCombinandoComandas(true);
      setErrorCombine(null);

      await apiService.combinarComandas(comandaDestinoCombine.id, comandaOrigenCombine.id);
      
      // Recargar datos
      await cargarMesas();
      await cargarComandasActivas();
      
      // Cerrar modal
      cancelarCombinarComanda();
      
      console.log('✅ Comandas combinadas exitosamente');
    } catch (error: any) {
      console.error('Error al combinar comandas:', error);
      setErrorCombine(error.response?.data?.error || 'Error al combinar las comandas');
    } finally {
      setCombinandoComandas(false);
    }
  };

  const getStatusBadgeStyles = (estado: string) => {
    switch (estado) {
      case 'pendiente':
      case 'abierta':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparando':
      case 'en_preparacion':
        return 'bg-blue-100 text-blue-800';
      case 'lista':
        return 'bg-green-100 text-green-800';
      case 'entregada':
        return 'bg-gray-100 text-gray-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
      case 'abierta':
        return <Clock size={12} />;
      case 'preparando':
      case 'en_preparacion':
        return <AlertCircle size={12} />;
      case 'lista':
      case 'entregada':
        return <Check size={12} />;
      default:
        return <Clock size={12} />;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Mesa(s)</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
    <div className="space-y-6">
      {/* Campo de Mesero - Movido al inicio */}
      {/* Campo de Mesero - ELIMINADO */}

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
          {Object.entries(mesasAgrupadasYOrdenadas).map(([salon, mesasSalon]) => (
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

      {/* Comandas Activas para Editar - Movido al final */}
      {comandasActivas.length > 0 && onEditarComanda && (
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4 flex items-center">
            <Edit className="mr-2" size={20} />
            Comandas Activas para Editar
          </h2>
          <div className="space-y-6">
            {/* Agrupar comandas por salón */}
            {(() => {
              // Agrupar comandas por salón o tipo especial
              const comandasPorSalon = comandasActivas.reduce((acc: { [key: string]: Comanda[] }, comanda) => {
                let clave: string;
                
                if (comanda.tipo_pedido === 'domicilio' || comanda.tipo_pedido === 'llevar') {
                  clave = esParaLlevar(comanda) ? '🛍️ Para Llevar' : '🏠 Domicilios';
                } else if (comanda.mesas && Array.isArray(comanda.mesas) && comanda.mesas.length > 0) {
                  // Usar el salón de la primera mesa
                  clave = comanda.mesas[0].salon;
                } else {
                  clave = 'Sin salón';
                }
                
                if (!acc[clave]) {
                  acc[clave] = [];
                }
                acc[clave].push(comanda);
                return acc;
              }, {});

              // Ordenar las claves para mostrar domicilios al final
              const clavesOrdenadas = Object.keys(comandasPorSalon).sort((a, b) => {
                if (a.startsWith('🏠') || a.startsWith('🛍️')) return 1;
                if (b.startsWith('🏠') || b.startsWith('🛍️')) return -1;
                return a.localeCompare(b);
              });

              return clavesOrdenadas.map((salon) => (
                <div key={salon} className="border rounded-lg p-4 bg-secondary-25">
                  <h3 className="font-semibold text-lg text-secondary-800 mb-3 border-b pb-2">
                    {salon}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {comandasPorSalon[salon].map((comanda) => (
                      <div
                        key={comanda.id}
                        className="border rounded-lg p-4 bg-white hover:bg-primary-25 transition-colors shadow-sm hover:shadow-md"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            {comanda.tipo_pedido === 'domicilio' || comanda.tipo_pedido === 'llevar' ? (
                              <>
                                <div className="flex items-center mb-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    esParaLlevar(comanda) 
                                      ? 'bg-amber-100 text-amber-800' 
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {esParaLlevar(comanda) ? '🛍️ Para llevar' : '🏠 Domicilio'}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-secondary-800">
                                  {getNombreCliente(comanda)}
                                </h3>
                                {parseDatosCliente(comanda)?.direccion && !esParaLlevar(comanda) && (
                                  <p className="text-xs text-secondary-500 mt-1">
                                    📍 {parseDatosCliente(comanda).direccion}
                                  </p>
                                )}
                              </>
                            ) : (
                              <h3 className="font-semibold text-secondary-800">
                                {Array.isArray(comanda.mesas) ? comanda.mesas.map(m => `${m.salon} - ${m.numero}`).join(', ') : 'Sin mesa'}
                              </h3>
                            )}
                            <p className="text-sm text-secondary-600 mt-1">
                              Atendido por: {comanda.usuario_nombre || comanda.mesero || 'N/A'}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusBadgeStyles(comanda.estado)}`}>
                            {getStatusIcon(comanda.estado)}
                            <span className="capitalize">{comanda.estado.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="text-sm text-secondary-600 mb-2">
                          {comanda.items?.length || 0} item(s)
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-primary-600">
                            ${comanda.total.toLocaleString()}
                          </span>
                          <div className="flex flex-wrap justify-end gap-2">
                            {comanda.tipo_pedido !== 'domicilio' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    iniciarCombinarComanda(comanda);
                                  }}
                                  className="text-purple-600 hover:text-purple-800 text-sm flex items-center px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                                  title="Combinar con otra comanda"
                                >
                                  <Merge size={14} className="mr-1" />
                                  Combinar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    iniciarCambioMesa(comanda);
                                  }}
                                  className="text-orange-600 hover:text-orange-800 text-sm flex items-center px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                                  title="Cambiar mesa"
                                >
                                  <Repeat size={14} className="mr-1" />
                                  Cambiar Mesa
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditarComanda(comanda);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center px-2 py-1 rounded hover:bg-blue-50"
                            >
                              <Edit size={14} className="mr-1" />
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Modal de Cambio de Mesa */}
      {mostrarModalCambioMesa && comandaCambiandoMesa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-secondary-800 flex items-center">
                    <Repeat className="mr-2" size={24} />
                    Cambiar Mesa
                  </h2>
                  <p className="text-sm text-secondary-600 mt-1">
                    Comanda actual: {Array.isArray(comandaCambiandoMesa.mesas) ? comandaCambiandoMesa.mesas.map(m => `${m.salon} - ${m.numero}`).join(', ') : 'Sin mesa'}
                  </p>
                </div>
                <button
                  onClick={cancelarCambioMesa}
                  className="text-secondary-500 hover:text-secondary-700"
                  disabled={cambiandoMesa}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ Selecciona la(s) nueva(s) mesa(s) para esta comanda. Las mesas actuales se liberarán automáticamente.
                </p>
              </div>

              {errorCambioMesa && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{errorCambioMesa}</p>
                </div>
              )}

              {/* Selección de nuevas mesas */}
              <div className="space-y-6">
                {Object.entries(mesasAgrupadasYOrdenadas).map(([salon, mesasSalon]) => (
                  <div key={salon} className="border rounded-lg p-4 bg-secondary-25">
                    <h3 className="font-semibold text-lg text-secondary-800 mb-3">
                      {salon}
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {mesasSalon.map((mesa) => {
                        const estaSeleccionada = mesasSeleccionadasCambio.find(m => m.id === mesa.id);
                        const esLaMesaActual = Array.isArray(comandaCambiandoMesa.mesas) && comandaCambiandoMesa.mesas.find(m => m.id === mesa.id);
                        
                        return (
                          <button
                            key={mesa.id}
                            onClick={() => toggleMesaCambio(mesa)}
                            disabled={mesa.ocupada || cambiandoMesa}
                            className={`p-4 rounded-lg border-2 text-center transition-all ${
                              estaSeleccionada
                                ? 'border-primary-500 bg-primary-100 text-primary-800'
                                : mesa.ocupada
                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'border-secondary-300 bg-white hover:border-primary-300 hover:bg-primary-50'
                            } ${esLaMesaActual ? 'ring-2 ring-orange-400' : ''}`}
                            title={
                              esLaMesaActual ? 'Mesa actual' :
                              mesa.ocupada ? 'Mesa ocupada' : 
                              `Capacidad: ${mesa.capacidad} personas`
                            }
                          >
                            <div className="font-bold text-lg">{mesa.numero}</div>
                            <div className="text-xs mt-1">
                              {mesa.ocupada ? '🔴' : '🟢'} {mesa.capacidad}p
                            </div>
                            {esLaMesaActual && (
                              <div className="text-xs text-orange-600 font-medium mt-1">
                                Actual
                              </div>
                            )}
                            {estaSeleccionada && (
                              <div className="mt-1">
                                <Check size={16} className="mx-auto text-primary-600" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {mesasSeleccionadasCambio.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Nueva(s) mesa(s) seleccionada(s): {mesasSeleccionadasCambio.map(m => `${m.salon} - ${m.numero}`).join(', ')}
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-secondary-200 p-6">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelarCambioMesa}
                  disabled={cambiandoMesa}
                  className="px-6 py-2 text-secondary-700 border border-secondary-300 rounded-lg hover:bg-secondary-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarCambioMesa}
                  disabled={mesasSeleccionadasCambio.length === 0 || cambiandoMesa}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {cambiandoMesa ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <Check size={16} className="mr-2" />
                      Confirmar Cambio
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Combinar Comandas */}
      {mostrarModalCombine && comandaDestinoCombine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-secondary-200 p-6 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-secondary-800 flex items-center">
                    <Merge className="mr-2 text-purple-600" size={24} />
                    Combinar Comandas
                  </h2>
                  <p className="text-sm text-secondary-600 mt-1">
                    Destino: {comandaDestinoCombine.tipo_pedido === 'domicilio' 
                      ? `Domicilio - ${comandaDestinoCombine.datos_cliente?.nombre}`
                      : `Mesas: ${Array.isArray(comandaDestinoCombine.mesas) ? comandaDestinoCombine.mesas.map(m => m.numero).join(', ') : 'Sin mesa'}`
                    }
                  </p>
                </div>
                <button
                  onClick={cancelarCombinarComanda}
                  className="text-secondary-500 hover:text-secondary-700"
                  disabled={combinandoComandas}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  Selecciona la comanda que deseas **fusionar hacia** la comanda de destino. 
                  Todos los productos y mesas se unirán en una sola cuenta. Esta acción no se puede deshacer.
                </p>
              </div>

              {errorCombine && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {errorCombine}
                </div>
              )}

              <h3 className="font-semibold text-secondary-700 mb-3">Comandas Disponibles</h3>
              <div className="space-y-3">
                {comandasActivas
                  .filter(c => c.id !== comandaDestinoCombine.id)
                  .map(comanda => (
                    <button
                      key={comanda.id}
                      onClick={() => setComandaOrigenCombine(comanda)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        comandaOrigenCombine?.id === comanda.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-secondary-200 hover:border-purple-300 hover:bg-secondary-25'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-secondary-900">
                            {comanda.tipo_pedido === 'domicilio' 
                              ? `🏠 ${comanda.datos_cliente?.nombre || 'Domicilio'}`
                              : `🪑 Mesas: ${Array.isArray(comanda.mesas) ? comanda.mesas.map(m => m.numero).join(', ') : 'Sin mesa'}`
                            }
                          </p>
                          <p className="text-xs text-secondary-500">
                            Mesero: {comanda.mesero} | {comanda.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">
                            ${comanda.total.toLocaleString()}
                          </p>
                          {comandaOrigenCombine?.id === comanda.id && (
                            <Check size={18} className="ml-auto text-purple-600" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                }
                {comandasActivas.length <= 1 && (
                  <p className="text-center py-8 text-secondary-500 italic">
                    No hay otras comandas activas para combinar.
                  </p>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-secondary-200 p-6">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelarCombinarComanda}
                  disabled={combinandoComandas}
                  className="px-6 py-2 text-secondary-700 border border-secondary-300 rounded-lg hover:bg-secondary-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarCombinacion}
                  disabled={!comandaOrigenCombine || combinandoComandas}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-bold"
                >
                  {combinandoComandas ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Fusionando...
                    </>
                  ) : (
                    <>
                      <Merge size={16} className="mr-2" />
                      Confirmar y Fusionar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
