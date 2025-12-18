'use client';

import { useState } from 'react';
import { FormularioComanda } from '@/types';
import { apiService } from '@/services/api';
import { Printer, Send, AlertCircle } from 'lucide-react';

interface ResumenComandaProps {
  formulario: FormularioComanda;
  onObservacionesChange: (observaciones: string) => void;
  modoEdicion?: boolean;
  comandaId?: string;
}

export default function ResumenComanda({ formulario, onObservacionesChange, modoEdicion = false, comandaId }: ResumenComandaProps) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mostrarDialogoImpresion, setMostrarDialogoImpresion] = useState(false);

  const calcularSubtotal = (): number => {
    return formulario.items.reduce((total, item) => total + item.subtotal, 0);
  };

  const calcularTotal = (): number => {
    // Aquí podrías agregar lógica para impuestos, descuentos, etc.
    return calcularSubtotal();
  };

  const enviarComanda = async () => {
    if (!formulario.mesas || formulario.mesas.length === 0 || formulario.items.length === 0) {
      setError('Debe seleccionar al menos una mesa y un producto');
      return;
    }

    if (!formulario.mesero || formulario.mesero.trim() === '') {
      setError('Debe ingresar el nombre del mesero');
      return;
    }

    // Si estamos editando, mostrar diálogo de confirmación para impresión
    if (modoEdicion && comandaId) {
      setMostrarDialogoImpresion(true);
      return;
    }

    // Si no estamos editando, enviar normalmente
    await procesarEnvioComanda();
  };

  const procesarEnvioComanda = async (imprimirAdicionales?: boolean) => {
    try {
      setEnviando(true);
      setError(null);

      const comandaData = {
        mesas: formulario.mesas,
        items: formulario.items,
        subtotal: calcularSubtotal(),
        total: calcularTotal(),
        mesero: formulario.mesero,
        observaciones_generales: formulario.observaciones_generales
      };

      if (modoEdicion && comandaId) {
        // Editar comanda existente - con opción de imprimir o no
        await apiService.editarComanda(
          comandaId, 
          comandaData.items, 
          comandaData.observaciones_generales, 
          imprimirAdicionales
        );
        
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // Crear nueva comanda
        const response = await apiService.createComanda(comandaData);
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error) {
      console.error('Error al procesar comanda:', error);
      setError(`Error al ${modoEdicion ? 'actualizar' : 'crear'} la comanda. Intente nuevamente.`);
    } finally {
      setEnviando(false);
      setMostrarDialogoImpresion(false);
    }
  };

  const mostrarVistaPrevia = () => {
    // En modo edición, filtrar solo los nuevos items
    const itemsParaPrevia = modoEdicion ? 
      formulario.items.filter(item => item.id.startsWith('temp_')) : 
      formulario.items;
    
    const comandaInfo = `
CASA MONTIS - VISTA PREVIA ${modoEdicion ? 'ITEMS ADICIONALES' : 'COMANDA'}
=======================================
Mesero: ${formulario.mesero}
Mesa(s): ${formulario.mesas?.map(m => `${m.salon} - ${m.numero}`).join(', ')}
Capacidad total: ${formulario.mesas?.reduce((sum, mesa) => sum + mesa.capacidad, 0)} personas
${modoEdicion ? '\n⚠️  ESTOS SON ITEMS ADICIONALES' : ''}
${modoEdicion ? '⚠️  PARA COMANDA EXISTENTE\n' : ''}

PRODUCTOS:
${itemsParaPrevia.map(item => {
  let itemText = `${item.cantidad}x ${item.producto.nombre} - $${item.subtotal.toLocaleString('es-CO')}`;
  if (item.personalizacion) {
    const personalizaciones = [];
    if (item.personalizacion.caldo) personalizaciones.push(`Caldo: ${item.personalizacion.caldo.nombre}`);
    if (item.personalizacion.principio) personalizaciones.push(`Principio: ${item.personalizacion.principio.nombre}`);
    if (item.personalizacion.proteina) personalizaciones.push(`Proteína: ${item.personalizacion.proteina.nombre}`);
    if (item.personalizacion.bebida) personalizaciones.push(`Bebida: ${item.personalizacion.bebida.nombre}`);
    if (personalizaciones.length > 0) {
      itemText += `\n   ${personalizaciones.join(' | ')}`;
    }
  }
  if (item.observaciones) {
    itemText += `\n   Obs: ${item.observaciones}`;
  }
  return itemText;
}).join('\n')}

${formulario.observaciones_generales ? `\nObservaciones: ${formulario.observaciones_generales}` : ''}

${modoEdicion ? 'TOTAL ADICIONAL' : 'SUBTOTAL'}: $${itemsParaPrevia.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString('es-CO')}
${!modoEdicion ? `TOTAL: $${calcularTotal().toLocaleString('es-CO')}` : ''}
=======================================
    `.trim();

    // Mostrar en una ventana emergente
    const nuevaVentana = window.open('', '_blank', 'width=600,height=700');
    if (nuevaVentana) {
      nuevaVentana.document.write(`
        <html>
          <head>
            <title>Vista Previa - ${modoEdicion ? 'Items Adicionales' : 'Comanda'}</title>
            <style>
              body { font-family: monospace; padding: 20px; white-space: pre-line; }
              .print-btn { margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
              .warning { color: #dc2626; font-weight: bold; }
            </style>
          </head>
          <body>
            ${comandaInfo.replace(/\n/g, '<br>')}
            <button class="print-btn" onclick="window.print()">Imprimir</button>
          </body>
        </html>
      `);
      nuevaVentana.document.close();
    }
  };

  if (success) {
    return (
      <div className="card text-center">
        <div className="text-green-600 mb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">¡Comanda Enviada!</h2>
          <p className="text-green-700">
            La comanda ha sido enviada exitosamente a cocina y se ha impreso automáticamente.
          </p>
          <p className="text-sm text-green-600 mt-2">
            Redirigiendo en unos segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Información de la mesa */}
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Información de la Comanda</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Mesa</label>
            <div className="p-3 bg-secondary-50 rounded-lg">
              {formulario.mesas?.map(m => `${m.salon} - ${m.numero}`).join(', ')} 
              (Capacidad total: {formulario.mesas?.reduce((sum, mesa) => sum + mesa.capacidad, 0)})
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Tipo de Servicio</label>
            <div className="p-3 bg-secondary-50 rounded-lg capitalize">
              {formulario.tipo_servicio?.replace('_', ' ')}
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Observaciones Generales
          </label>
          <textarea
            value={formulario.observaciones_generales || ''}
            onChange={(e) => onObservacionesChange(e.target.value)}
            placeholder="Observaciones especiales para toda la comanda..."
            rows={3}
            className="input-field"
          />
        </div>
      </div>

      {/* Resumen de productos */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">
          Resumen de Productos ({formulario.items.length} items)
        </h3>
        
        <div className="space-y-3">
          {formulario.items.map((item) => (
            <div key={item.id} className="flex justify-between items-start p-3 bg-secondary-50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-secondary-800">
                  {item.producto.nombre}
                </div>
                <div className="text-sm text-secondary-600">
                  Cantidad: {item.cantidad} x ${item.precio_unitario.toLocaleString()}
                </div>
                {item.observaciones && (
                  <div className="text-sm text-blue-600 mt-1">
                    <strong>Obs:</strong> {item.observaciones}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-secondary-800">
                  ${item.subtotal.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Totales */}
        <div className="mt-6 pt-4 border-t border-secondary-200">
          <div className="space-y-2">
            <div className="flex justify-between text-secondary-700">
              <span>Subtotal:</span>
              <span>${calcularSubtotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-secondary-800">
              <span>Total:</span>
              <span>${calcularTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="text-red-500 mr-2" size={20} />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={enviarComanda}
            disabled={enviando || formulario.items.length === 0}
            className="btn-primary flex-1 flex items-center justify-center"
          >
            {enviando ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {modoEdicion ? 'Actualizando...' : 'Enviando...'}
              </>
            ) : (
              <>
                <Send size={20} className="mr-2" />
                {modoEdicion ? 'Actualizar Comanda' : 'Enviar Comanda'}
              </>
            )}
          </button>
          
          <button
            onClick={mostrarVistaPrevia}
            disabled={enviando}
            className="btn-secondary flex items-center justify-center"
          >
            <Printer size={20} className="mr-2" />
            Vista Previa
          </button>
        </div>
        
        <div className="mt-4 text-sm text-secondary-600 text-center">
          <p>{modoEdicion ? 'Al actualizar se pueden agregar productos adicionales' : 'Al enviar la comanda se imprimirá automáticamente en cocina'}</p>
        </div>
      </div>

      {/* Diálogo de confirmación de impresión para ediciones */}
      {mostrarDialogoImpresion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <Printer className="text-primary-600 mr-3" size={32} />
              <h3 className="text-xl font-bold text-secondary-800">
                ¿Imprimir productos adicionales?
              </h3>
            </div>
            
            <p className="text-secondary-700 mb-6">
              Estás agregando productos a una comanda existente. ¿Deseas imprimir estos productos adicionales en cocina?
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-800">
                <strong>💡 Sugerencia:</strong> Normalmente no se imprimen bebidas o postres que se piden al final de la comida.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => procesarEnvioComanda(false)}
                disabled={enviando}
                className="flex-1 px-4 py-3 bg-secondary-100 hover:bg-secondary-200 text-secondary-800 font-semibold rounded-lg transition-colors"
              >
                No imprimir
              </button>
              <button
                onClick={() => procesarEnvioComanda(true)}
                disabled={enviando}
                className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
              >
                {enviando ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Printer size={18} className="mr-2" />
                    Sí, imprimir
                  </>
                )}
              </button>
            </div>

            {!enviando && (
              <button
                onClick={() => setMostrarDialogoImpresion(false)}
                className="w-full mt-3 px-4 py-2 text-secondary-600 hover:text-secondary-800 text-sm transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
