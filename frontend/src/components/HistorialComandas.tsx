'use client';

import { useState, useEffect } from 'react';
import { ComandaHistorial } from '@/types';
import { apiService } from '@/services/api';
import { Calendar, Clock, User, MapPin, DollarSign, ChevronDown, ChevronUp, UtensilsCrossed, Truck, ShoppingBag, Printer, Receipt } from 'lucide-react';
import { usePersonalizaciones } from '@/components/shared';

export default function HistorialComandas() {
  const [comandas, setComandas] = useState<ComandaHistorial[]>([]);
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [pagina, setPagina] = useState(1);
  const [totalComandas, setTotalComandas] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { categorias: categoriasPersonalizacion, itemsPorCategoria: itemsPersonalizacion, ordenarPersonalizaciones } = usePersonalizaciones();
  const [configFacturacion, setConfigFacturacion] = useState<any>(null);

  useEffect(() => {
    cargarHistorial(1, '');
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

  const cargarHistorial = async (pageNum: number = 1, fecha: string = '', isFiltro: boolean = false) => {
    try {
      if (pageNum === 1) {
        setCargando(true);
      } else {
        setCargandoMas(true);
      }
      
      const response = await apiService.getHistorialComandas(fecha, pageNum, 20);
      
      if (pageNum === 1) {
        setComandas(response.data);
      } else {
        setComandas(prev => [...prev, ...response.data]);
      }
      
      setTotalComandas(response.pagination.total);
      setPagina(pageNum);
      setHasMore(response.pagination.page < response.pagination.totalPages);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      if (pageNum === 1) {
        setCargando(false);
      } else {
        setCargandoMas(false);
      }
    }
  };

  const handleFiltroFecha = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fecha = e.target.value;
    setFiltroFecha(fecha);
    cargarHistorial(1, fecha, true);
  };

  const cargarMasComandas = () => {
    cargarHistorial(pagina + 1, filtroFecha);
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

  const getIconoTipoPedido = (comanda: ComandaHistorial) => {
    if (comanda.tipo_pedido === 'domicilio') {
      if (comanda.datos_cliente?.es_para_llevar) {
        return <ShoppingBag className="w-4 h-4" />;
      }
      return <Truck className="w-4 h-4" />;
    }
    return <UtensilsCrossed className="w-4 h-4" />;
  };

  const getTextoTipoPedido = (comanda: ComandaHistorial) => {
    if (comanda.tipo_pedido === 'domicilio') {
      if (comanda.datos_cliente?.es_para_llevar) {
        return 'Para Llevar';
      }
      return `Domicilio${comanda.datos_cliente?.nombre ? ': ' + comanda.datos_cliente.nombre : ''}`;
    }
    if (Array.isArray(comanda.mesas) && comanda.mesas.length > 0) {
      return `Mesa ${comanda.mesas.map(m => `${m.salon}-${m.numero}`).join(', ')}`;
    }
    return 'N/A';
  };

  // Helper para centrar texto en facturas térmicas (32 caracteres aprox)
  const centrarTexto = (texto: string, ancho: number = 32): string => {
    if (texto.length >= ancho) return texto;
    const espacios = Math.floor((ancho - texto.length) / 2);
    return ' '.repeat(espacios) + texto;
  };

  const reimprimirRecibo = (comanda: ComandaHistorial) => {
    if (!configFacturacion) return;

    // Usar la fecha original de la comanda para evitar actualizaciones incorrectas
    const fechaComanda = comanda.fecha_creacion ? new Date(comanda.fecha_creacion) : new Date();
    const numeroFactura = Math.floor(Math.random() * 9999) + 1000;
    const esCancelada = comanda.estado.toLowerCase() === 'cancelada';
    const metodoPago = comanda.metodo_pago ? comanda.metodo_pago.toUpperCase() : 'NO REGISTRADO';
    
    // Información de mesa o cliente según tipo
    let mesaInfo = '';
    if (comanda.tipo_pedido === 'domicilio' && comanda.datos_cliente) {
      const tipo = comanda.datos_cliente.es_para_llevar ? 'PARA LLEVAR' : 'DOMICILIO';
      mesaInfo = `${tipo}: ${comanda.datos_cliente.nombre}`;
      if (comanda.datos_cliente.telefono) {
        mesaInfo += `\nTel: ${comanda.datos_cliente.telefono}`;
      }
      if (!comanda.datos_cliente.es_para_llevar && comanda.datos_cliente.direccion) {
        mesaInfo += `\nDir: ${comanda.datos_cliente.direccion}`;
      }
    } else if (Array.isArray(comanda.mesas) && comanda.mesas.length > 0) {
      mesaInfo = `MESA: ${comanda.mesas.map((m: any) => `${m.salon}-${m.numero}`).join(', ')}`;
    }

    // Calcular IVA si aplica
    let subtotal = comanda.total;
    let iva = 0;
    let total = comanda.total;

    if (configFacturacion.responsable_iva && configFacturacion.porcentaje_iva) {
      subtotal = comanda.total / (1 + configFacturacion.porcentaje_iva / 100);
      iva = comanda.total - subtotal;
    }

    // Construir línea de teléfonos
    const telefonos = [];
    if (configFacturacion.telefonos && configFacturacion.telefonos.length > 0 && configFacturacion.telefonos[0]) {
      telefonos.push(configFacturacion.telefonos[0]);
    }
    if (configFacturacion.telefono2 && configFacturacion.telefono2.trim()) {
      telefonos.push(configFacturacion.telefono2);
    }
    const lineaTelefonos = telefonos.length > 0 ? `TEL: ${telefonos.join(' - ')}` : '';

    // Construir línea de ubicación (departamento + ciudad)
    const ubicacionParts = [];
    if (configFacturacion.departamento) ubicacionParts.push(configFacturacion.departamento);
    if (configFacturacion.ciudad) ubicacionParts.push(configFacturacion.ciudad);
    const lineaUbicacion = ubicacionParts.length > 0 ? ubicacionParts.join(' - ') : (configFacturacion.ubicacion_geografica || '');
    
    const reciboContent = `
================================
${centrarTexto(configFacturacion.nombre_empresa)}
${centrarTexto(`CC./NIT.: ${configFacturacion.nit}`)}
${centrarTexto(configFacturacion.responsable_iva ? 'RESPONSABLE DE IVA' : 'NO RESPONSABLE DE IVA')}
${centrarTexto(configFacturacion.direccion)}
${lineaUbicacion ? centrarTexto(lineaUbicacion) : ''}
${lineaTelefonos ? centrarTexto(lineaTelefonos) : ''}
================================
      RECIBO DE PAGO
No. ${numeroFactura}
CAJA 01
${mesaInfo}
FECHA: ${fechaComanda.toLocaleDateString('es-CO')} ${fechaComanda.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
${esCancelada ? '*** SERVICIO CANCELADO ***' : `PAGO: ${metodoPago}`}
================================
CANT ARTICULO          TOTAL
--------------------------------
${(comanda.items || []).map((item: any) => {
  const maxLength = 16;
  const nombre = item.producto.nombre;
  
  // Si el nombre es corto, usar padding normal
  if (nombre.length <= maxLength) {
    return `${item.cantidad.toString().padStart(3, ' ')}  ${nombre.padEnd(maxLength)} ${item.subtotal.toLocaleString('es-CO').padStart(7, ' ')}`;
  } else {
    // Si es largo, dividir en múltiples líneas
    const words = nombre.split(' ');
    let currentLine = '';
    let lines = [];
    
    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Primera línea con cantidad y total
    let itemText = `${item.cantidad.toString().padStart(3, ' ')}  ${lines[0].padEnd(maxLength)} ${item.subtotal.toLocaleString('es-CO').padStart(7, ' ')}`;
    
    // Líneas adicionales del nombre, indentadas
    for (let i = 1; i < lines.length; i++) {
      itemText += `\n     ${lines[i]}`;
    }
    
    return itemText;
  }
}).join('\n')}
--------------------------------
${configFacturacion.responsable_iva && configFacturacion.porcentaje_iva ? `SUBTOTAL               ${subtotal.toLocaleString('es-CO').padStart(7, ' ')}
IVA (${configFacturacion.porcentaje_iva}%)            ${iva.toLocaleString('es-CO').padStart(7, ' ')}
--------------------------------
` : ''}VLR TOTAL              ${total.toLocaleString('es-CO').padStart(7, ' ')}
================================
${esCancelada ? `
*** SERVICIO CANCELADO ***
    NO SE REALIZÓ COBRO
================================` : `PAGO: ${metodoPago}

TOTAL                  ${total.toLocaleString('es-CO').padStart(7, ' ')}
PAGO                   ${(comanda.monto_pagado || total).toLocaleString('es-CO').padStart(7, ' ')}
CAMBIO                 ${(comanda.cambio || 0).toLocaleString('es-CO').padStart(7, ' ')}
================================
   GRACIAS POR SU COMPRA
      VUELVA PRONTO
================================`}
    `;

    // Navegar a la página de recibo con los datos (usando base64)
    const reciboData = btoa(unescape(encodeURIComponent(reciboContent)));
    window.open(`/recibo?data=${reciboData}`, '_blank');
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
                cargarHistorial(1, '');
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
                <p className="text-2xl font-bold text-gray-900">{totalComandas}</p>
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
            comandas.map((comanda, index) => (
              <div key={comanda.id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 transition-colors"
                  onClick={() => toggleExpansion(comanda.id.toString())}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Número y estado */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-gray-800">#{(comanda as any).numero_comanda || comanda.id.slice(0, 8)}</span>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${getEstadoColor(comanda.estado)}`}>
                          {comanda.estado.charAt(0).toUpperCase() + comanda.estado.slice(1)}
                        </span>
                      </div>
                      
                      {/* Mesero */}
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">{comanda.usuario_nombre || comanda.mesero}</span>
                      </div>
                      
                      {/* Tipo de pedido con icono dinámico */}
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        comanda.tipo_pedido === 'domicilio' ? 'bg-green-50' : 'bg-orange-50'
                      }`}>
                        <div className={comanda.tipo_pedido === 'domicilio' ? 'text-green-600' : 'text-orange-600'}>
                          {getIconoTipoPedido(comanda)}
                        </div>
                        <span className={`text-sm font-medium ${
                          comanda.tipo_pedido === 'domicilio' ? 'text-green-700' : 'text-orange-700'
                        }`}>
                          {comanda.tipo_pedido === 'domicilio' 
                            ? comanda.datos_cliente?.es_para_llevar 
                              ? 'Para Llevar'
                              : comanda.datos_cliente?.nombre || 'Domicilio'
                            : Array.isArray(comanda.mesas) && comanda.mesas.length > 0
                              ? `Mesa ${comanda.mesas.map(m => `${m.salon}-${m.numero}`).join(', ')}`
                              : 'N/A'
                          }
                        </span>
                      </div>
                      
                      {/* Fecha y hora */}
                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">
                          {formatearFecha(comanda.fecha_creacion?.toString() || new Date().toString())}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Total e items */}
                      <div className="text-right">
                        <p className="text-2xl font-bold text-black">
                          ${comanda.total.toLocaleString('es-CO')}
                        </p>
                        <p className="text-xs text-gray-500 font-medium">
                          {comanda.items?.length || 0} items
                        </p>
                      </div>

                      {/* Botón reimprimir recibo */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reimprimirRecibo(comanda);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        title="Reimprimir recibo"
                      >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">Recibo</span>
                      </button>
                      
                      {/* Icono expandir/contraer */}
                      <div className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        {expandidas.has(comanda.id.toString()) ? (
                          <ChevronUp className="w-5 h-5 text-gray-700" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-700" />
                        )}
                      </div>
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
                                          const categoriaId = key;
                                          const itemId = value as string;
                                          
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
                                      <span className="font-medium">${(comanda.subtotal || comanda.total || 0).toLocaleString('es-CO')}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                      <span className="text-gray-900 font-medium">Total:</span>
                                      <span className="font-bold text-lg">${(comanda.total || 0).toLocaleString('es-CO')}</span>
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
      {!cargando && hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={cargarMasComandas}
            disabled={cargandoMas}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {cargandoMas ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
            {cargandoMas ? 'Cargando...' : `Ver más comandas (${totalComandas - comandas.length} restantes)`}
          </button>
        </div>
      )}

      {/* Mensaje cuando se muestran todas */}
      {!cargando && comandas.length > 0 && !hasMore && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Mostrando todas las comandas ({comandas.length})
          </p>
        </div>
      )}
    </div>
  );
}
