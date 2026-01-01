'use client';

import { useState, useEffect } from 'react';
import { ReporteVentas, ProductoVendido, VentaPorHora } from '@/types';
import { apiService } from '@/services/api';
import { 
  TrendingUp, DollarSign, ShoppingCart, Calendar, Download, 
  TrendingDown, Clock, AlertCircle, Flame, CreditCard, 
  ArrowUp, ArrowDown, Minus, ChevronDown, ChevronRight, Package
} from 'lucide-react';

export default function Reportes() {
  const [reporte, setReporte] = useState<ReporteVentas | null>(null);
  const [reporteRango, setReporteRango] = useState<ReporteVentas[]>([]);
  
  // Función helper para obtener fecha local en formato YYYY-MM-DD
  const obtenerFechaLocal = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    obtenerFechaLocal()
  );
  const [fechaInicio, setFechaInicio] = useState<string>(
    obtenerFechaLocal(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  );
  const [fechaFin, setFechaFin] = useState<string>(
    obtenerFechaLocal()
  );
  const [vistaActual, setVistaActual] = useState<'dia' | 'rango'>('dia');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set());

  useEffect(() => {
    cargarReporte();
  }, [fechaSeleccionada]);

  const cargarReporte = async () => {
    try {
      setLoading(true);
      if (vistaActual === 'dia') {
        const reporteData = await apiService.getReporteVentas(fechaSeleccionada);
        setReporte(reporteData);
      } else {
        const reporteData = await apiService.getReporteVentasPorRango(fechaInicio, fechaFin);
        setReporteRango(reporteData);
      }
      setError(null);
    } catch (err) {
      setError('Error al cargar el reporte');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportarReporte = () => {
    if (vistaActual === 'dia' && reporte) {
      let contenido = `REPORTE DE VENTAS - CASA MONTIS
Fecha: ${new Date(reporte.fecha).toLocaleDateString('es-CO')}
========================================

📊 RESUMEN GENERAL
----------------------------------------
Total de Ventas: $${reporte.total_ventas.toLocaleString()}
Cantidad de Comandas: ${reporte.cantidad_comandas}
Promedio por Comanda: $${Math.round(reporte.promedio_por_comanda).toLocaleString()}
`;

      // Añadir comparativas si existen
      if (reporte.comparativas) {
        contenido += `\n\n📈 COMPARATIVAS
----------------------------------------
vs Día Anterior: ${reporte.comparativas.vs_dia_anterior.ventas_porcentaje > 0 ? '+' : ''}${reporte.comparativas.vs_dia_anterior.ventas_porcentaje.toFixed(1)}% ($${reporte.comparativas.vs_dia_anterior.ventas.toLocaleString()})
vs Semana Anterior: ${reporte.comparativas.vs_semana_anterior.ventas_porcentaje > 0 ? '+' : ''}${reporte.comparativas.vs_semana_anterior.ventas_porcentaje.toFixed(1)}% ($${reporte.comparativas.vs_semana_anterior.ventas.toLocaleString()})
vs Promedio Semanal: ${reporte.comparativas.vs_promedio_semanal.ventas_porcentaje > 0 ? '+' : ''}${reporte.comparativas.vs_promedio_semanal.ventas_porcentaje.toFixed(1)}% ($${reporte.comparativas.vs_promedio_semanal.ventas.toLocaleString()})
`;
      }

      // Añadir métodos de pago si existen
      if (reporte.metodos_pago && reporte.metodos_pago.length > 0) {
        contenido += `\n\n💳 MÉTODOS DE PAGO
----------------------------------------\n`;
        reporte.metodos_pago.forEach(m => {
          contenido += `${m.metodo.toUpperCase()}: $${m.total.toLocaleString()} (${m.porcentaje.toFixed(1)}%)\n`;
          if (m.comision_estimada && m.comision_estimada > 0) {
            contenido += `  Comisión estimada: $${m.comision_estimada.toLocaleString()}\n`;
          }
        });
      }

      // Añadir productos más vendidos
      contenido += `\n\n🏆 PRODUCTOS MÁS VENDIDOS
----------------------------------------\n`;
      reporte.productos_mas_vendidos.slice(0, 10).forEach((p, i) => {
        contenido += `${i + 1}. ${p.producto.nombre}: ${p.cantidad_vendida} unidades - $${p.total_vendido.toLocaleString()}\n`;
      });

      // Añadir ventas por hora
      contenido += `\n\n🕐 VENTAS POR HORA
----------------------------------------\n`;
      reporte.ventas_por_hora.forEach(v => {
        const marcador = v.es_pico ? '🔥 ' : v.es_muerta ? '💤 ' : '   ';
        contenido += `${marcador}${v.hora}:00 - $${v.ventas.toLocaleString()} (${v.comandas} comandas)\n`;
      });

      // Añadir alertas si existen
      if (reporte.alertas && reporte.alertas.length > 0) {
        contenido += `\n\n⚡ ALERTAS
----------------------------------------\n`;
        reporte.alertas.forEach(alerta => {
          contenido += `${alerta}\n`;
        });
      }

      const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ventas-${reporte.fecha}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const calcularTotalRango = () => {
    return reporteRango.reduce((sum, r) => sum + r.total_ventas, 0);
  };

  const calcularComandasRango = () => {
    return reporteRango.reduce((sum, r) => sum + r.cantidad_comandas, 0);
  };

  // Agrupar productos por categoría
  const agruparPorCategoria = (productos: ProductoVendido[]) => {
    const agrupado: { [categoria: string]: { items: ProductoVendido[], totalUnidades: number, totalVentas: number } } = {};
    
    productos.forEach(item => {
      const categoria = item.producto.categoria || 'Sin categoría';
      if (!agrupado[categoria]) {
        agrupado[categoria] = { items: [], totalUnidades: 0, totalVentas: 0 };
      }
      agrupado[categoria].items.push(item);
      agrupado[categoria].totalUnidades += item.cantidad_vendida;
      agrupado[categoria].totalVentas += item.total_vendido;
    });

    // Ordenar items dentro de cada categoría por total vendido
    Object.values(agrupado).forEach(cat => {
      cat.items.sort((a, b) => b.total_vendido - a.total_vendido);
    });

    return agrupado;
  };

  // Combinar productos de múltiples reportes (para vista rango)
  const combinarProductosRango = () => {
    const combinado: { [productoId: number]: ProductoVendido } = {};
    
    reporteRango.forEach(reporte => {
      reporte.productos_mas_vendidos.forEach(item => {
        if (!combinado[item.producto.id]) {
          combinado[item.producto.id] = { ...item };
        } else {
          combinado[item.producto.id].cantidad_vendida += item.cantidad_vendida;
          combinado[item.producto.id].total_vendido += item.total_vendido;
        }
      });
    });

    return Object.values(combinado);
  };

  const toggleCategoria = (categoria: string) => {
    setCategoriasExpandidas(prev => {
      const nuevas = new Set(prev);
      if (nuevas.has(categoria)) {
        nuevas.delete(categoria);
      } else {
        nuevas.add(categoria);
      }
      return nuevas;
    });
  };

  const formatearNombreCategoria = (categoria: string) => {
    return categoria
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const IconoComparativa = ({ porcentaje }: { porcentaje: number }) => {
    if (porcentaje > 5) return <ArrowUp className="text-green-500" size={16} />;
    if (porcentaje < -5) return <ArrowDown className="text-red-500" size={16} />;
    return <Minus className="text-gray-500" size={16} />;
  };

  const getColorComparativa = (porcentaje: number) => {
    if (porcentaje > 5) return 'text-green-600';
    if (porcentaje < -5) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-secondary-600">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-red-600 text-center py-4">
          {error}
          <button 
            onClick={cargarReporte}
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-secondary-800">Reportes de Ventas</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setVistaActual('dia')}
            className={`px-4 py-2 rounded-lg ${
              vistaActual === 'dia'
                ? 'bg-primary-500 text-white'
                : 'bg-secondary-200 text-secondary-700'
            }`}
          >
            Día
          </button>
          <button
            onClick={() => setVistaActual('rango')}
            className={`px-4 py-2 rounded-lg ${
              vistaActual === 'rango'
                ? 'bg-primary-500 text-white'
                : 'bg-secondary-200 text-secondary-700'
            }`}
          >
            Rango
          </button>
        </div>
      </div>

      {/* Controles de fecha */}
      <div className="card">
        <div className="flex items-center space-x-4 flex-wrap">
          {vistaActual === 'dia' ? (
            <>
              <div className="flex items-center space-x-2">
                <Calendar size={20} className="text-secondary-500" />
                <label className="text-sm font-medium text-secondary-700">
                  Fecha:
                </label>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  className="input-field"
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Calendar size={20} className="text-secondary-500" />
                <label className="text-sm font-medium text-secondary-700">
                  Desde:
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-secondary-700">
                  Hasta:
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="input-field"
                />
              </div>
            </>
          )}
          <button
            onClick={cargarReporte}
            className="btn-primary"
          >
            Actualizar
          </button>
          <button
            onClick={exportarReporte}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {vistaActual === 'dia' && reporte ? (
        <>
          {/* Alertas inteligentes */}
          {reporte.alertas && reporte.alertas.length > 0 && (
            <div className="card bg-blue-50 border-l-4 border-blue-500">
              <div className="flex items-start space-x-3">
                <AlertCircle className="text-blue-500 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800 mb-2">Alertas del Día</h3>
                  <div className="space-y-1">
                    {reporte.alertas.map((alerta, index) => (
                      <p key={index} className="text-sm text-blue-700">{alerta}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Métricas principales con comparativas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Ventas */}
            <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">Total Ventas</p>
                  <p className="text-3xl font-bold mb-2">
                    ${reporte.total_ventas.toLocaleString()}
                  </p>
                  {reporte.comparativas && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-1">
                        <IconoComparativa porcentaje={reporte.comparativas.vs_dia_anterior.ventas_porcentaje} />
                        <span>{reporte.comparativas.vs_dia_anterior.ventas_porcentaje > 0 ? '+' : ''}{reporte.comparativas.vs_dia_anterior.ventas_porcentaje.toFixed(1)}% vs ayer</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <IconoComparativa porcentaje={reporte.comparativas.vs_promedio_semanal.ventas_porcentaje} />
                        <span>{reporte.comparativas.vs_promedio_semanal.ventas_porcentaje > 0 ? '+' : ''}{reporte.comparativas.vs_promedio_semanal.ventas_porcentaje.toFixed(1)}% vs promedio</span>
                      </div>
                    </div>
                  )}
                </div>
                <DollarSign size={48} className="opacity-20" />
              </div>
            </div>

            {/* Total Comandas */}
            <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Comandas</p>
                  <p className="text-3xl font-bold mb-2">
                    {reporte.cantidad_comandas}
                  </p>
                  {reporte.comparativas && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-1">
                        <IconoComparativa porcentaje={reporte.comparativas.vs_dia_anterior.comandas_porcentaje} />
                        <span>{reporte.comparativas.vs_dia_anterior.comandas_porcentaje > 0 ? '+' : ''}{reporte.comparativas.vs_dia_anterior.comandas_porcentaje.toFixed(1)}% vs ayer</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <IconoComparativa porcentaje={reporte.comparativas.vs_promedio_semanal.comandas_porcentaje} />
                        <span>{reporte.comparativas.vs_promedio_semanal.comandas_porcentaje > 0 ? '+' : ''}{reporte.comparativas.vs_promedio_semanal.comandas_porcentaje.toFixed(1)}% vs promedio</span>
                      </div>
                    </div>
                  )}
                </div>
                <ShoppingCart size={48} className="opacity-20" />
              </div>
            </div>

            {/* Promedio por Comanda */}
            <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Promedio por Comanda</p>
                  <p className="text-3xl font-bold">
                    ${Math.round(reporte.promedio_por_comanda).toLocaleString()}
                  </p>
                </div>
                <TrendingUp size={48} className="opacity-20" />
              </div>
            </div>
          </div>

          {/* Métodos de Pago */}
          {reporte.metodos_pago && reporte.metodos_pago.length > 0 && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard size={20} className="text-secondary-700" />
                <h3 className="text-lg font-semibold text-secondary-800">
                  Métodos de Pago
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reporte.metodos_pago.map((metodo) => (
                  <div key={metodo.metodo} className="border border-secondary-200 rounded-lg p-4">
                    <p className="text-sm text-secondary-600 mb-1 capitalize">{metodo.metodo}</p>
                    <p className="text-2xl font-bold text-secondary-800 mb-1">
                      ${metodo.total.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between text-xs text-secondary-600">
                      <span>{metodo.porcentaje.toFixed(1)}% del total</span>
                      <span>{metodo.cantidad} transacciones</span>
                    </div>
                    {metodo.comision_estimada && metodo.comision_estimada > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Comisión: -${metodo.comision_estimada.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productos más vendidos */}
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <Flame size={20} className="text-orange-500" />
                <h3 className="text-lg font-semibold text-secondary-800">
                  Productos Más Vendidos
                </h3>
              </div>
              {reporte.productos_mas_vendidos.length === 0 ? (
                <p className="text-secondary-600 text-center py-4">
                  No hay datos de productos
                </p>
              ) : (
                <div className="space-y-3">
                  {reporte.productos_mas_vendidos.slice(0, 10).map((item, index) => (
                    <div key={item.producto.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-primary-100 text-primary-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-secondary-800 truncate">
                            {item.producto.nombre}
                          </p>
                          <p className="text-sm text-secondary-600">
                            {item.cantidad_vendida} unidades
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-primary-600 ml-2">
                        ${item.total_vendido.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ventas por hora mejoradas */}
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <Clock size={20} className="text-secondary-700" />
                <h3 className="text-lg font-semibold text-secondary-800">
                  Ventas por Hora
                </h3>
              </div>
              {reporte.ventas_por_hora.length === 0 ? (
                <p className="text-secondary-600 text-center py-4">
                  No hay datos de ventas por hora
                </p>
              ) : (
                <div className="space-y-2">
                  {reporte.ventas_por_hora.map((hora) => (
                    <div 
                      key={hora.hora} 
                      className={`flex items-center justify-between py-2 px-2 rounded ${
                        hora.es_pico ? 'bg-orange-50 border border-orange-200' :
                        hora.es_muerta ? 'bg-gray-50' :
                        'border-b border-secondary-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {hora.es_pico && <Flame size={16} className="text-orange-500" />}
                        <span className="font-medium text-secondary-800">
                          {hora.hora}:00
                        </span>
                        <span className="text-sm text-secondary-600">
                          ({hora.comandas} comandas)
                        </span>
                        {hora.es_pico && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            Hora pico
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="bg-primary-200 h-2 rounded transition-all"
                          style={{
                            width: `${Math.max(10, (hora.ventas / Math.max(...reporte.ventas_por_hora.map(h => h.ventas))) * 80)}px`
                          }}
                        ></div>
                        <span className="font-bold text-primary-600 min-w-[90px] text-right">
                          ${hora.ventas.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ventas por Categoría */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Package size={20} className="text-secondary-700" />
              <h3 className="text-lg font-semibold text-secondary-800">
                Ventas por Categoría
              </h3>
            </div>
            {reporte.productos_mas_vendidos.length === 0 ? (
              <p className="text-secondary-600 text-center py-4">
                No hay datos de productos por categoría
              </p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const categorias = agruparPorCategoria(reporte.productos_mas_vendidos);
                  const categoriasOrdenadas = Object.entries(categorias)
                    .sort((a, b) => b[1].totalVentas - a[1].totalVentas);
                  
                  return categoriasOrdenadas.map(([categoria, datos]) => {
                    const estaExpandida = categoriasExpandidas.has(categoria);
                    
                    return (
                      <div key={categoria} className="border border-secondary-200 rounded-lg overflow-hidden">
                        {/* Header de categoría */}
                        <button
                          onClick={() => toggleCategoria(categoria)}
                          className="w-full flex items-center justify-between p-3 bg-secondary-50 hover:bg-secondary-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {estaExpandida ? (
                              <ChevronDown size={20} className="text-secondary-600" />
                            ) : (
                              <ChevronRight size={20} className="text-secondary-600" />
                            )}
                            <span className="font-semibold text-secondary-800">
                              {formatearNombreCategoria(categoria)}
                            </span>
                            <span className="text-sm text-secondary-600">
                              ({datos.items.length} productos)
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-secondary-600">
                              {datos.totalUnidades} unidades.
                            </span>
                            <span className="font-bold text-primary-600">
                              ${datos.totalVentas.toLocaleString()}
                            </span>
                          </div>
                        </button>
                        
                        {/* Items de la categoría */}
                        {estaExpandida && (
                          <div className="p-3 space-y-2 bg-white">
                            {datos.items.map((item, index) => (
                              <div 
                                key={item.producto.id} 
                                className="flex items-center justify-between py-2 px-3 bg-secondary-25 rounded"
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                  </span>
                                  <span className="text-secondary-800">
                                    {item.producto.nombre}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <span className="text-sm text-secondary-600">
                                    {item.cantidad_vendida} unidades.
                                  </span>
                                  <span className="font-semibold text-primary-600 min-w-[80px] text-right">
                                    ${item.total_vendido.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </>
      ) : (
        reporteRango.length > 0 && (
          <>
            {/* Resumen del rango */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
                <div className="flex items-center space-x-3">
                  <DollarSign size={24} />
                  <div>
                    <p className="text-green-100">Total Período</p>
                    <p className="text-2xl font-bold">
                      ${calcularTotalRango().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <div className="flex items-center space-x-3">
                  <ShoppingCart size={24} />
                  <div>
                    <p className="text-blue-100">Total Comandas</p>
                    <p className="text-2xl font-bold">
                      {calcularComandasRango()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="flex items-center space-x-3">
                  <TrendingUp size={24} />
                  <div>
                    <p className="text-orange-100">Promedio Diario</p>
                    <p className="text-2xl font-bold">
                      ${reporteRango.length > 0 
                        ? Math.round(calcularTotalRango() / reporteRango.length).toLocaleString()
                        : '0'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de ventas por día */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">
                Ventas por Día
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-2 px-4 font-medium text-secondary-700">Fecha</th>
                      <th className="text-right py-2 px-4 font-medium text-secondary-700">Comandas</th>
                      <th className="text-right py-2 px-4 font-medium text-secondary-700">Ventas</th>
                      <th className="text-right py-2 px-4 font-medium text-secondary-700">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporteRango.map((dia) => (
                      <tr key={dia.fecha} className="border-b border-secondary-100 hover:bg-secondary-50">
                        <td className="py-3 px-4">
                          {new Date(dia.fecha + 'T00:00:00').toLocaleDateString('es-CO', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="text-right py-3 px-4">
                          {dia.cantidad_comandas}
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-primary-600">
                          ${dia.total_ventas.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          ${Math.round(dia.promedio_por_comanda).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ventas por Categoría (Rango) */}
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <Package size={20} className="text-secondary-700" />
                <h3 className="text-lg font-semibold text-secondary-800">
                  Ventas por Categoría (Período Completo)
                </h3>
              </div>
              {(() => {
                const productosCombinados = combinarProductosRango();
                if (productosCombinados.length === 0) {
                  return (
                    <p className="text-secondary-600 text-center py-4">
                      No hay datos de productos por categoría
                    </p>
                  );
                }
                
                const categorias = agruparPorCategoria(productosCombinados);
                const categoriasOrdenadas = Object.entries(categorias)
                  .sort((a, b) => b[1].totalVentas - a[1].totalVentas);
                
                return (
                  <div className="space-y-2">
                    {categoriasOrdenadas.map(([categoria, datos]) => {
                      const estaExpandida = categoriasExpandidas.has(`rango_${categoria}`);
                      
                      return (
                        <div key={categoria} className="border border-secondary-200 rounded-lg overflow-hidden">
                          {/* Header de categoría */}
                          <button
                            onClick={() => toggleCategoria(`rango_${categoria}`)}
                            className="w-full flex items-center justify-between p-3 bg-secondary-50 hover:bg-secondary-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              {estaExpandida ? (
                                <ChevronDown size={20} className="text-secondary-600" />
                              ) : (
                                <ChevronRight size={20} className="text-secondary-600" />
                              )}
                              <span className="font-semibold text-secondary-800">
                                {formatearNombreCategoria(categoria)}
                              </span>
                              <span className="text-sm text-secondary-600">
                                ({datos.items.length} productos)
                              </span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-secondary-600">
                                {datos.totalUnidades} unidades.
                              </span>
                              <span className="font-bold text-primary-600">
                                ${datos.totalVentas.toLocaleString()}
                              </span>
                            </div>
                          </button>
                          
                          {/* Items de la categoría */}
                          {estaExpandida && (
                            <div className="p-3 space-y-2 bg-white">
                              {datos.items.map((item, index) => (
                                <div 
                                  key={item.producto.id} 
                                  className="flex items-center justify-between py-2 px-3 bg-secondary-25 rounded"
                                >
                                  <div className="flex items-center space-x-3">
                                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </span>
                                    <span className="text-secondary-800">
                                      {item.producto.nombre}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <span className="text-sm text-secondary-600">
                                      {item.cantidad_vendida} unidades.
                                    </span>
                                    <span className="font-semibold text-primary-600 min-w-[80px] text-right">
                                      ${item.total_vendido.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </>
        )
      )}
    </div>
  );
}
