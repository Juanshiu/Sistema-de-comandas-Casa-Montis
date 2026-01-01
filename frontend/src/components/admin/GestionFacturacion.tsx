'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, X, Save, AlertCircle, Check } from 'lucide-react';
import apiService from '@/services/api';

interface ConfiguracionFacturacion {
  id?: number;
  nombre_empresa: string;
  nit: string;
  responsable_iva: boolean;
  porcentaje_iva: number | null;
  direccion: string;
  ubicacion_geografica: string;
  telefonos: string[];
}

export default function GestionFacturacion() {
  const [config, setConfig] = useState<ConfiguracionFacturacion>({
    nombre_empresa: '',
    nit: '',
    responsable_iva: false,
    porcentaje_iva: null,
    direccion: '',
    ubicacion_geografica: '',
    telefonos: ['']
  });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const data = await apiService.getConfiguracionFacturacion();
      setConfig(data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      mostrarMensaje('error', 'Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!config.nombre_empresa.trim()) {
      mostrarMensaje('error', 'El nombre de la empresa es requerido');
      return;
    }
    if (!config.nit.trim()) {
      mostrarMensaje('error', 'El NIT es requerido');
      return;
    }
    if (!config.direccion.trim()) {
      mostrarMensaje('error', 'La dirección es requerida');
      return;
    }
    if (!config.ubicacion_geografica.trim()) {
      mostrarMensaje('error', 'La ubicación geográfica es requerida');
      return;
    }
    if (config.telefonos.filter(t => t.trim()).length === 0) {
      mostrarMensaje('error', 'Debe agregar al menos un teléfono');
      return;
    }
    if (config.responsable_iva && (!config.porcentaje_iva || config.porcentaje_iva <= 0)) {
      mostrarMensaje('error', 'Si es responsable de IVA, debe indicar el porcentaje');
      return;
    }

    try {
      setGuardando(true);
      
      // Filtrar teléfonos vacíos
      const configToSend = {
        ...config,
        telefonos: config.telefonos.filter(t => t.trim()),
        porcentaje_iva: config.responsable_iva ? config.porcentaje_iva : null
      };

      await apiService.updateConfiguracionFacturacion(configToSend);
      mostrarMensaje('exito', '✅ Configuración guardada exitosamente');
      await cargarConfiguracion();
    } catch (error: any) {
      console.error('Error al guardar configuración:', error);
      mostrarMensaje('error', error.response?.data?.error || 'Error al guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  const agregarTelefono = () => {
    setConfig({ ...config, telefonos: [...config.telefonos, ''] });
  };

  const eliminarTelefono = (index: number) => {
    if (config.telefonos.length > 1) {
      const nuevosTelefonos = config.telefonos.filter((_, i) => i !== index);
      setConfig({ ...config, telefonos: nuevosTelefonos });
    }
  };

  const actualizarTelefono = (index: number, valor: string) => {
    const nuevosTelefonos = [...config.telefonos];
    nuevosTelefonos[index] = valor;
    setConfig({ ...config, telefonos: nuevosTelefonos });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Configuración de Facturas y Recibos</h2>
            <p className="text-blue-100 text-sm">
              Personaliza la información que aparecerá en tus facturas y recibos
            </p>
          </div>
        </div>
      </div>

      {/* Mensaje de feedback */}
      {mensaje && (
        <div
          className={`flex items-center space-x-3 p-4 rounded-lg border-2 ${
            mensaje.tipo === 'exito'
              ? 'bg-green-50 border-green-500 text-green-800'
              : 'bg-red-50 border-red-500 text-red-800'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <Check className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <p className="font-medium">{mensaje.texto}</p>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div className="space-y-6">
          {/* Información de la Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={config.nombre_empresa}
                onChange={(e) => setConfig({ ...config, nombre_empresa: e.target.value })}
                className="w-full px-4 py-2 border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ej: CASA MONTIS RESTAURANTE"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                NIT / CC *
              </label>
              <input
                type="text"
                value={config.nit}
                onChange={(e) => setConfig({ ...config, nit: e.target.value })}
                className="w-full px-4 py-2 border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ej: 26420708-2"
              />
            </div>
          </div>

          {/* IVA */}
          <div className="border-2 border-secondary-200 rounded-lg p-4 bg-secondary-50">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="responsable_iva"
                checked={config.responsable_iva}
                onChange={(e) => setConfig({ 
                  ...config, 
                  responsable_iva: e.target.checked,
                  porcentaje_iva: e.target.checked ? config.porcentaje_iva : null
                })}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <label htmlFor="responsable_iva" className="text-sm font-semibold text-secondary-700">
                ¿Es responsable de IVA?
              </label>
            </div>

            {config.responsable_iva && (
              <div className="ml-8">
                <label className="block text-sm font-semibold text-secondary-700 mb-2">
                  Porcentaje de IVA (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={config.porcentaje_iva || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    porcentaje_iva: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  className="w-full md:w-1/3 px-4 py-2 border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ej: 19"
                />
                <p className="text-xs text-secondary-500 mt-1">
                  El IVA se mostrará desglosado en facturas y recibos
                </p>
              </div>
            )}
          </div>

          {/* Dirección y Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                Dirección *
              </label>
              <input
                type="text"
                value={config.direccion}
                onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                className="w-full px-4 py-2 border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ej: CRA 9 # 11 07 - EDUARDO SANTOS"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">
                Ubicación Geográfica *
              </label>
              <input
                type="text"
                value={config.ubicacion_geografica}
                onChange={(e) => setConfig({ ...config, ubicacion_geografica: e.target.value })}
                className="w-full px-4 py-2 border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ej: PALERMO - HUILA"
              />
            </div>
          </div>

          {/* Teléfonos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-secondary-700">
                Teléfonos de Contacto *
              </label>
              <button
                type="button"
                onClick={agregarTelefono}
                className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                <Plus size={16} />
                <span>Agregar Teléfono</span>
              </button>
            </div>

            <div className="space-y-3">
              {config.telefonos.map((telefono, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => actualizarTelefono(index, e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ej: 3132171025"
                  />
                  {config.telefonos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => eliminarTelefono(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar teléfono"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botón de guardar */}
          <div className="flex justify-end pt-4 border-t border-secondary-200">
            <button
              type="submit"
              disabled={guardando}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {guardando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Vista previa */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h3 className="text-lg font-bold text-secondary-900 mb-4">Vista Previa</h3>
        <div className="bg-secondary-50 border-2 border-dashed border-secondary-300 rounded-lg p-6 font-mono text-sm">
          <div className="text-center space-y-1">
            <div className="font-bold">{config.nombre_empresa || 'NOMBRE EMPRESA'}</div>
            <div>CC./NIT.: {config.nit || 'NIT'}</div>
            <div>{config.responsable_iva ? 'RESPONSABLE DE IVA' : 'NO RESPONSABLE DE IVA'}</div>
            {config.responsable_iva && config.porcentaje_iva && (
              <div>IVA: {config.porcentaje_iva}%</div>
            )}
            <div>{config.direccion || 'DIRECCIÓN'}</div>
            <div>{config.ubicacion_geografica || 'UBICACIÓN'}</div>
            <div>
              TEL: {config.telefonos.filter(t => t.trim()).join(' - ') || 'TELÉFONOS'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
