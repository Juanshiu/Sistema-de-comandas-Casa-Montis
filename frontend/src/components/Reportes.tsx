'use client';

import { useState, useEffect } from 'react';
import { ReporteVentas, ProductoVendido, VentaPorHora } from '@/types';
import { apiService } from '@/services/api';
import { TrendingUp, DollarSign, ShoppingCart, Calendar, Download } from 'lucide-react';

export default function Reportes() {
  const [reporte, setReporte] = useState<ReporteVentas | null>(null);
  const [reporteRango, setReporteRango] = useState<ReporteVentas[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [fechaInicio, setFechaInicio] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [fechaFin, setFechaFin] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [vistaActual, setVistaActual] = useState<'dia' | 'rango'>('dia');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const contenido = `Reporte de Ventas - ${reporte.fecha}
Total de Ventas: $${reporte.total_ventas.toLocaleString()}
Cantidad de Comandas: ${reporte.cantidad_comandas}

Productos Más Vendidos:
${reporte.productos_mas_vendidos.map(p => 
  `${p.producto.nombre}: ${p.cantidad_vendida} unidades - $${p.total_vendido.toLocaleString()}`
).join('\n')}

Ventas por Hora:
${reporte.ventas_por_hora.map(v => 
  `${v.hora}: $${v.ventas.toLocaleString()} (${v.comandas} comandas)`
).join('\n')}
      `;
      
      const blob = new Blob([contenido], { type: 'text/plain' });
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
        <div className="flex items-center space-x-4">
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
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="flex items-center space-x-3">
                <DollarSign size={24} />
                <div>
                  <p className="text-green-100">Total Ventas</p>
                  <p className="text-2xl font-bold">
                    ${reporte.total_ventas.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <div className="flex items-center space-x-3">
                <ShoppingCart size={24} />
                <div>
                  <p className="text-blue-100">Comandas</p>
                  <p className="text-2xl font-bold">
                    {reporte.cantidad_comandas}
                  </p>
                </div>
              </div>
            </div>

            <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <div className="flex items-center space-x-3">
                <TrendingUp size={24} />
                <div>
                  <p className="text-purple-100">Promedio por Comanda</p>
                  <p className="text-2xl font-bold">
                    ${reporte.cantidad_comandas > 0 
                      ? Math.round(reporte.total_ventas / reporte.cantidad_comandas).toLocaleString()
                      : '0'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productos más vendidos */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">
                Productos Más Vendidos
              </h3>
              {reporte.productos_mas_vendidos.length === 0 ? (
                <p className="text-secondary-600 text-center py-4">
                  No hay datos de productos
                </p>
              ) : (
                <div className="space-y-3">
                  {reporte.productos_mas_vendidos.slice(0, 10).map((item, index) => (
                    <div key={item.producto.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-secondary-800">
                            {item.producto.nombre}
                          </p>
                          <p className="text-sm text-secondary-600">
                            {item.cantidad_vendida} unidades vendidas
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-primary-600">
                        ${item.total_vendido.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ventas por hora */}
            <div className="card">
              <h3 className="text-lg font-semibold text-secondary-800 mb-4">
                Ventas por Hora
              </h3>
              {reporte.ventas_por_hora.length === 0 ? (
                <p className="text-secondary-600 text-center py-4">
                  No hay datos de ventas por hora
                </p>
              ) : (
                <div className="space-y-2">
                  {reporte.ventas_por_hora.map((hora) => (
                    <div key={hora.hora} className="flex items-center justify-between py-2 border-b border-secondary-100">
                      <div>
                        <span className="font-medium text-secondary-800">
                          {hora.hora}:00
                        </span>
                        <span className="text-sm text-secondary-600 ml-2">
                          ({hora.comandas} comandas)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="bg-primary-200 h-2 rounded"
                          style={{
                            width: `${Math.max(10, (hora.ventas / Math.max(...reporte.ventas_por_hora.map(h => h.ventas))) * 80)}px`
                          }}
                        ></div>
                        <span className="font-bold text-primary-600 min-w-[80px] text-right">
                          ${hora.ventas.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                      <tr key={dia.fecha} className="border-b border-secondary-100">
                        <td className="py-2 px-4">
                          {new Date(dia.fecha).toLocaleDateString()}
                        </td>
                        <td className="text-right py-2 px-4">
                          {dia.cantidad_comandas}
                        </td>
                        <td className="text-right py-2 px-4 font-bold text-primary-600">
                          ${dia.total_ventas.toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-4">
                          ${dia.cantidad_comandas > 0 
                            ? Math.round(dia.total_ventas / dia.cantidad_comandas).toLocaleString()
                            : '0'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
