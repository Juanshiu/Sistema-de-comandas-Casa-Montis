'use client';

import { useState, useEffect } from 'react';
import { Building2, Save, AlertCircle, Check, Phone, Mail, MapPin, Globe, User, Hash, Briefcase, FileText } from 'lucide-react';
import apiService from '@/services/api';
import { ConfiguracionFacturacion } from '@/types';

export default function GestionEmpresa() {
  const [config, setConfig] = useState<ConfiguracionFacturacion>({
    nombre_empresa: '',
    nit: '',
    responsable_iva: false,
    porcentaje_iva: null,
    direccion: '',
    ubicacion_geografica: '',
    telefonos: [''],
    representante_legal: '',
    tipo_identificacion: 'NIT',
    departamento: '',
    ciudad: '',
    telefono2: '',
    correo_electronico: '',
    responsabilidad_tributaria: 'No responsable de IVA',
    tributos: [],
    zona: '',
    sitio_web: '',
    alias: '',
    actividad_economica: '',
    descripcion: ''
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
      // Asegurarse de que los campos opcionales tengan valores por defecto
      setConfig({
        ...config,
        ...data,
        telefonos: data.telefonos?.length ? data.telefonos : [''],
        tributos: data.tributos || []
      });
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      mostrarMensaje('error', 'Error al cargar los datos de la empresa');
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
    if (!config.nombre_empresa.trim()) {
      mostrarMensaje('error', 'El nombre comercial es requerido');
      return;
    }

    try {
      setGuardando(true);
      await apiService.updateConfiguracionFacturacion(config);
      mostrarMensaje('exito', '✅ Datos de la empresa actualizados exitosamente');
    } catch (error: any) {
      console.error('Error al guardar:', error);
      mostrarMensaje('error', 'Error al actualizar los datos');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-teal-600 rounded-xl p-6 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/20 rounded-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Información de la Empresa</h2>
            <p className="text-teal-100 text-sm">Gestiona los datos legales y comerciales para documentos y reportes</p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {mensaje.tipo === 'exito' ? <Check size={20} /> : <AlertCircle size={20} />}
          <p className="font-medium">{mensaje.texto}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-secondary-200">
        <div className="p-6 space-y-8">
          {/* Secciones del Formulario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Columna Izquierda: Datos Básicos */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-teal-700 flex items-center gap-2 border-b pb-2">
                <Hash size={20} /> Identificación Comercial
              </h3>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  value={config.nombre_empresa}
                  onChange={(e) => setConfig({ ...config, nombre_empresa: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej: CASA MONTIS RESTAURANTE"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Representante Legal</label>
                <input
                  type="text"
                  value={config.representante_legal}
                  onChange={(e) => setConfig({ ...config, representante_legal: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej: Diana Milena Segura Lavao"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo Identificación</label>
                  <select
                    value={config.tipo_identificacion}
                    onChange={(e) => setConfig({ ...config, tipo_identificacion: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="NIT">NIT</option>
                    <option value="CC">Cédula de Ciudadanía</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número (Nit/CC)</label>
                  <input
                    type="text"
                    value={config.nit}
                    onChange={(e) => setConfig({ ...config, nit: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Columna Derecha: Contacto */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-teal-700 flex items-center gap-2 border-b pb-2">
                <MapPin size={20} /> Ubicación y Contacto
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Departamento</label>
                  <input
                    type="text"
                    value={config.departamento}
                    onChange={(e) => setConfig({ ...config, departamento: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={config.ciudad}
                    onChange={(e) => setConfig({ ...config, ciudad: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección Completa</label>
                <input
                  type="text"
                  value={config.direccion}
                  onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Celular Principal</label>
                  <input
                    type="text"
                    value={config.telefonos[0]}
                    onChange={(e) => {
                      const t = [...config.telefonos];
                      t[0] = e.target.value;
                      setConfig({ ...config, telefonos: t });
                    }}
                    className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono 2 (Opcional)</label>
                  <input
                    type="text"
                    value={config.telefono2}
                    onChange={(e) => setConfig({ ...config, telefono2: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Información Tributaria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-teal-700 flex items-center gap-2 border-b pb-2">
                <FileText size={20} /> Régimen Tributario
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={config.correo_electronico}
                    onChange={(e) => setConfig({ ...config, correo_electronico: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsabilidad Tributaria</label>
                <select
                  value={config.responsabilidad_tributaria}
                  onChange={(e) => setConfig({ ...config, responsabilidad_tributaria: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="No responsable de IVA">No responsable de IVA</option>
                  <option value="Responsable de IVA">Responsable de IVA</option>
                  <option value="Régimen Simple">Régimen Simple</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Actividad Económica (CIIU)</label>
                <input
                  type="text"
                  value={config.actividad_economica}
                  onChange={(e) => setConfig({ ...config, actividad_economica: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  placeholder="Ej: 5611"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-teal-700 flex items-center gap-2 border-b pb-2">
                <Briefcase size={20} /> Otros Datos
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sitio Web / Alias</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={config.sitio_web}
                    onChange={(e) => setConfig({ ...config, sitio_web: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción de la Empresa</label>
                <textarea
                  value={config.descripcion}
                  onChange={(e) => setConfig({ ...config, descripcion: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-teal-500 h-24"
                  placeholder="Esta descripción aparecerá en algunos documentos..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end">
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center space-x-2 px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold transition-all transform hover:scale-105 disabled:opacity-50 shadow-md"
          >
            {guardando ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Guardando...</span></>
            ) : (
              <><Save size={20} /><span>ACTUALIZAR DATOS</span></>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
