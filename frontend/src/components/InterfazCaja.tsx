'use client';

import { useState, useEffect } from 'react';
import { Comanda, Factura, EstadoComanda } from '@/types';
import { apiService } from '@/services/api';
import { CreditCard, DollarSign, Receipt, CheckCircle, Clock, AlertCircle, ArrowRightLeft } from 'lucide-react';

interface InterfazCajaProps {
  onMesaLiberada?: () => void;
}

export default function InterfazCaja({ onMesaLiberada }: InterfazCajaProps) {
  const [comandasActivas, setComandasActivas] = useState<Comanda[]>([]);
  const [comandaSeleccionada, setComandaSeleccionada] = useState<Comanda | null>(null);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'>('efectivo');
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarModalRecibo, setMostrarModalRecibo] = useState(false);
  const [facturaParaRecibo, setFacturaParaRecibo] = useState<any>(null);
  const [montoPagado, setMontoPagado] = useState<string>('');
  const [cambio, setCambio] = useState<number>(0);

  useEffect(() => {
    cargarComandasActivas();
    // Actualizar cada 5 segundos para tiempo real
    const interval = setInterval(cargarComandasActivas, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (comandaSeleccionada && montoPagado) {
      const pago = parseFloat(montoPagado) || 0;
      const total = comandaSeleccionada.total;
      setCambio(Math.max(0, pago - total));
    }
  }, [montoPagado, comandaSeleccionada]);

  const cargarComandasActivas = async () => {
    try {
      setLoading(true);
      const comandas = await apiService.getComandasActivas();
      setComandasActivas(comandas);
      setError(null);
    } catch (err) {
      setError('Error al cargar las comandas');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const procesarFactura = async () => {
    if (!comandaSeleccionada) return;

    // Validar monto pagado para efectivo
    if (metodoPago === 'efectivo') {
      const pago = parseFloat(montoPagado) || 0;
      if (pago < comandaSeleccionada.total) {
        alert('El monto pagado no puede ser menor al total de la cuenta');
        return;
      }
    }

    try {
      setProcesandoPago(true);
      
      // Crear factura
      const facturaData = {
        comanda_id: comandaSeleccionada.id,
        metodo_pago: metodoPago,
        cajero: 'Cajero Principal' // TODO: Obtener del contexto de usuario
      };

      const response = await apiService.crearFactura(facturaData);
      
      // Actualizar lista
      await cargarComandasActivas();
      
      // Preparar datos para el recibo
      const montoPagadoFinal = metodoPago === 'efectivo' ? parseFloat(montoPagado) : comandaSeleccionada.total;
      
      setFacturaParaRecibo({
        ...response,
        comanda: comandaSeleccionada,
        metodo_pago: metodoPago,
        monto_pagado: montoPagadoFinal,
        cambio: metodoPago === 'efectivo' ? cambio : 0
      });
      
      setComandaSeleccionada(null);
      setMontoPagado('');
      setCambio(0);
      
      if (onMesaLiberada) {
        onMesaLiberada();
      }

      // Mostrar modal para preguntar si quiere imprimir recibo
      setMostrarModalRecibo(true);
      
    } catch (err) {
      console.error('Error al procesar factura:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      alert(`Error al procesar la factura: ${errorMessage}`);
    } finally {
      setProcesandoPago(false);
    }
  };

  const generarFactura = () => {
    if (!comandaSeleccionada) return;
    
    const facturaContent = `
================================
    CASA MONTIS RESTAURANTE
      CC./NIT.: 26420708-2
    NO RESPONSABLE DE IVA
CRA 9 # 11 07 - EDUARDO SANTOS
      PALERMO - HUILA
TEL: 3132171025 - 3224588520
================================
Mesa(s): ${comandaSeleccionada.mesas.map(m => `${m.salon}-${m.numero}`).join(', ')}
Fecha: ${new Date().toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
Mesero: ${comandaSeleccionada.mesero}

PRODUCTOS:
${comandaSeleccionada.items.map(item => {
  let itemText = `${item.cantidad}x ${item.producto.nombre}
   $${item.precio_unitario.toLocaleString()}`;
  
  // Agregar personalización si existe
  if (item.personalizacion) {
    const personalizaciones = [];
    if (item.personalizacion.caldo) personalizaciones.push(`Caldo: ${item.personalizacion.caldo.nombre}`);
    if (item.personalizacion.principio) personalizaciones.push(`Principio: ${item.personalizacion.principio.nombre}`);
    if (item.personalizacion.proteina) personalizaciones.push(`Proteína: ${item.personalizacion.proteina.nombre}`);
    if (item.personalizacion.bebida) personalizaciones.push(`Bebida: ${item.personalizacion.bebida.nombre}`);
    
    if (personalizaciones.length > 0) {
      itemText += `\n   PERSONALIZACIÓN: ${personalizaciones.join(' | ')}`;
    }
  }
  
  if (item.observaciones) {
    itemText += `\n   Obs: ${item.observaciones}`;
  }
  
  return itemText;
}).join('\n\n')}

${comandaSeleccionada.observaciones_generales ? `\nObs. generales:\n${comandaSeleccionada.observaciones_generales}\n` : ''}
================================
SUBTOTAL: $${comandaSeleccionada.subtotal.toLocaleString('es-CO')}
TOTAL: $${comandaSeleccionada.total.toLocaleString('es-CO')}
================================
    GRACIAS POR SU COMPRA
       VUELVA PRONTO
================================
    `;
    
    // Navegar a la página de factura con los datos
    const facturaData = encodeURIComponent(facturaContent);
    window.open(`/factura?data=${facturaData}`, '_blank');
  };

  const generarRecibo = (factura: any) => {
    const fechaActual = new Date();
    const numeroFactura = Math.floor(Math.random() * 9999) + 1000;
    
    const reciboContent = `
================================
  CASA MONTIS RESTAURANTE
    CC./NIT.: 26420708-2
  NO RESPONSABLE DE IVA
CRA 9 # 11 07 - EDUARDO SANTOS
      PALERMO - HUILA
TEL: 3132171025 - 3224588520
================================
      CUENTA DE COBRO
No. ${numeroFactura}
CAJA 01
MESA: ${factura.comanda.mesas.map((m: any) => `${m.salon}-${m.numero}`).join(', ')}
FECHA: ${fechaActual.toLocaleDateString('es-CO')} ${fechaActual.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
PAGO: ${factura.metodo_pago.toUpperCase()}
================================
CANT ARTICULO          TOTAL
--------------------------------
${factura.comanda.items.map((item: any) => {
  const nombre = item.producto.nombre.length > 16 ? item.producto.nombre.substring(0, 16) : item.producto.nombre.padEnd(16);
  return `${item.cantidad.toString().padStart(3, ' ')}  ${nombre} ${item.subtotal.toLocaleString('es-CO').padStart(7, ' ')}`;
}).join('\n')}
--------------------------------
VLR TOTAL              ${factura.comanda.total.toLocaleString('es-CO').padStart(7, ' ')}
================================
PAGO: ${factura.metodo_pago.toUpperCase()}
                       ${factura.comanda.total.toLocaleString('es-CO').padStart(7, ' ')}

TOTAL CONSUMO          ${factura.comanda.total.toLocaleString('es-CO').padStart(7, ' ')}
TOTAL                  ${factura.comanda.total.toLocaleString('es-CO').padStart(7, ' ')}
PAGO                   ${factura.monto_pagado.toLocaleString('es-CO').padStart(7, ' ')}
CAMBIO                 ${factura.cambio.toLocaleString('es-CO').padStart(7, ' ')}
================================
   GRACIAS POR SU COMPRA
      VUELVA PRONTO
================================
    `;

    // Navegar a la página de recibo con los datos
    const reciboData = encodeURIComponent(reciboContent);
    window.open(`/recibo?data=${reciboData}`, '_blank');
  };

  const actualizarEstadoComanda = async (comandaId: string, nuevoEstado: EstadoComanda) => {
    try {
      await apiService.actualizarEstadoComanda(comandaId, nuevoEstado);
      await cargarComandasActivas();
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      alert('Error al actualizar el estado de la comanda');
    }
  };

  const getEstadoColor = (estado: EstadoComanda): string => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'preparando': return 'bg-blue-100 text-blue-800';
      case 'lista': return 'bg-green-100 text-green-800';
      case 'entregada': return 'bg-gray-100 text-gray-800';
      case 'cancelada': return 'bg-red-100 text-red-800';
      case 'facturada': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoIcon = (estado: EstadoComanda) => {
    switch (estado) {
      case 'pendiente': return <Clock size={16} />;
      case 'preparando': return <AlertCircle size={16} />;
      case 'lista': return <CheckCircle size={16} />;
      case 'entregada': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-secondary-600">Cargando comandas...</p>
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
            onClick={cargarComandasActivas}
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
        <h1 className="text-2xl font-bold text-secondary-800">Interfaz de Caja</h1>
        <button
          onClick={cargarComandasActivas}
          className="btn-secondary"
        >
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de comandas activas */}
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Comandas Activas ({comandasActivas.length})
          </h2>
          
          {comandasActivas.length === 0 ? (
            <p className="text-secondary-600 text-center py-8">
              No hay comandas activas
            </p>
          ) : (
            <div className="space-y-3">
              {comandasActivas.map((comanda) => (
                <div
                  key={comanda.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    comandaSeleccionada?.id === comanda.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                  onClick={() => setComandaSeleccionada(comanda)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-secondary-800">
                        Mesas: {comanda.mesas.map(m => `${m.salon} - ${m.numero}`).join(', ')}
                      </h3>
                      <p className="text-sm text-secondary-600">
                        {new Date(comanda.fecha_creacion).toLocaleString()}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getEstadoColor(comanda.estado)}`}>
                      {getEstadoIcon(comanda.estado)}
                      <span className="capitalize">{comanda.estado}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-secondary-600 mb-2">
                    {comanda.items?.length || 0} item(s) - Mesero: {comanda.mesero}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary-600">
                      ${comanda.total.toLocaleString()}
                    </span>
                    
                    <div className="flex space-x-2">
                      {comanda.estado === 'pendiente' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            actualizarEstadoComanda(comanda.id, 'preparando');
                          }}
                          className="text-yellow-600 hover:text-yellow-800 text-xs px-2 py-1 border border-yellow-600 rounded"
                        >
                          Preparando
                        </button>
                      )}
                      
                      {comanda.estado === 'preparando' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            actualizarEstadoComanda(comanda.id, 'lista');
                          }}
                          className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-600 rounded"
                        >
                          Marcar Lista
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detalle de comanda seleccionada */}
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-800 mb-4">
            Procesar Pago
          </h2>
          
          {!comandaSeleccionada ? (
            <p className="text-secondary-600 text-center py-8">
              Selecciona una comanda para procesar el pago
            </p>
          ) : (
            <div className="space-y-4">
              <div className="bg-secondary-50 p-4 rounded-lg">
                <h3 className="font-semibold text-secondary-800 mb-2">
                  Mesas: {comandaSeleccionada.mesas.map(m => `${m.salon} - ${m.numero}`).join(', ')}
                </h3>
                <p className="text-sm text-secondary-600">
                  Mesero: {comandaSeleccionada.mesero}
                </p>
                <p className="text-sm text-secondary-600">
                  Fecha: {new Date(comandaSeleccionada.fecha_creacion).toLocaleString()}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-secondary-800 mb-2">Items:</h4>
                <div className="space-y-2">
                  {comandaSeleccionada.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.producto.nombre} x {item.cantidad}
                        {item.personalizacion && (
                          <div className="text-xs text-secondary-500">
                            {item.personalizacion.caldo && `Caldo: ${item.personalizacion.caldo.nombre}`}
                            {item.personalizacion.principio && ` | Principio: ${item.personalizacion.principio.nombre}`}
                            {item.personalizacion.proteina && ` | Proteína: ${item.personalizacion.proteina.nombre}`}
                            {item.personalizacion.bebida && ` | Bebida: ${item.personalizacion.bebida.nombre}`}
                          </div>
                        )}
                      </span>
                      <span>${item.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary-600">
                    ${comandaSeleccionada.total.toLocaleString()}
                  </span>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Método de Pago:
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      onClick={() => setMetodoPago('efectivo')}
                      className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                        metodoPago === 'efectivo'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 text-secondary-700'
                      }`}
                    >
                      <DollarSign size={20} />
                      <span>Efectivo</span>
                    </button>
                    <button
                      onClick={() => setMetodoPago('tarjeta')}
                      className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                        metodoPago === 'tarjeta'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 text-secondary-700'
                      }`}
                    >
                      <CreditCard size={20} />
                      <span>Tarjeta</span>
                    </button>
                    <button
                      onClick={() => setMetodoPago('transferencia')}
                      className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                        metodoPago === 'transferencia'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 text-secondary-700'
                      }`}
                    >
                      <ArrowRightLeft size={20} />
                      <span>Transferencia</span>
                    </button>
                    <button
                      onClick={() => setMetodoPago('mixto')}
                      className={`p-3 border rounded-lg flex items-center justify-center space-x-2 ${
                        metodoPago === 'mixto'
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-300 text-secondary-700'
                      }`}
                    >
                      <Receipt size={20} />
                      <span>Mixto</span>
                    </button>
                  </div>
                </div>

                {metodoPago === 'efectivo' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Monto Pagado:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={montoPagado}
                        onChange={(e) => setMontoPagado(e.target.value)}
                        placeholder={`Mínimo: $${comandaSeleccionada.total.toLocaleString()}`}
                        className="flex-1 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setMontoPagado(comandaSeleccionada.total.toString())}
                        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors whitespace-nowrap"
                        title="Pago exacto"
                      >
                        💰 Exacto
                      </button>
                    </div>
                    {cambio > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        Cambio: ${cambio.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={generarFactura}
                    className="btn-secondary flex-1"
                  >
                    📄 Generar Factura
                  </button>
                  <button
                    onClick={procesarFactura}
                    disabled={
                      procesandoPago || 
                      comandaSeleccionada.estado !== 'lista' || 
                      (metodoPago === 'efectivo' && (!montoPagado || parseFloat(montoPagado) < comandaSeleccionada.total))
                    }
                    className="btn-primary flex-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {procesandoPago ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Procesando...</span>
                      </div>
                    ) : (
                      'Procesar Pago y Liberar Mesa'
                    )}
                  </button>
                </div>

                {comandaSeleccionada.estado !== 'lista' && (
                  <p className="text-sm text-yellow-600 mt-2 text-center">
                    La comanda debe estar "lista" para procesar el pago
                  </p>
                )}

                {metodoPago === 'efectivo' && montoPagado && parseFloat(montoPagado) < comandaSeleccionada.total && (
                  <p className="text-sm text-red-600 mt-2 text-center">
                    El monto pagado debe ser mayor o igual al total
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación para imprimir recibo */}
      {mostrarModalRecibo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-secondary-800 mb-4">
              ✅ Pago Procesado Exitosamente
            </h3>
            <p className="text-secondary-600 mb-6">
              ¿Desea imprimir el recibo para entregar al cliente?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  generarRecibo(facturaParaRecibo);
                  setMostrarModalRecibo(false);
                  setFacturaParaRecibo(null);
                }}
                className="btn-primary flex-1"
              >
                🖨️ Sí, imprimir recibo
              </button>
              <button
                onClick={() => {
                  setMostrarModalRecibo(false);
                  setFacturaParaRecibo(null);
                }}
                className="btn-secondary flex-1"
              >
                No, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
