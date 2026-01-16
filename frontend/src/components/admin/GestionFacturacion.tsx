'use client';

import { useState, useEffect } from 'react';
import { FileText, Building2 } from 'lucide-react';
import apiService from '@/services/api';
import { ConfiguracionFacturacion } from '@/types';

export default function GestionFacturacion() {
  const [config, setConfig] = useState<ConfiguracionFacturacion | null>(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Cargando vista previa...</p>
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
            <h2 className="text-2xl font-bold">Vista Previa de Facturación</h2>
            <p className="text-blue-100 text-sm">
              Visualización de cómo aparecerá la información en facturas y recibos
            </p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 text-yellow-800">
        <Building2 size={20} className="flex-shrink-0" />
        <p className="text-sm">
          Para modificar estos datos, diríjase a la sección de <strong>Empresa</strong> en el menú lateral.
        </p>
            </div>

      {/* Vista previa Estilo Recibo */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8">
        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center gap-2">
            <FileText size={20} className="text-primary-600" />
            Diseño de Encabezado (Recibo/Factura)
        </h3>
        
        <div className="max-w-md mx-auto bg-white border-2 border-dashed border-secondary-300 rounded-lg p-8 font-mono text-sm shadow-inner relative overflow-hidden">
          {/* Sello de agua simulado */}
          <div className="absolute top-0 right-0 p-2 opacity-10">
             <Building2 size={64} />
          </div>

          <div className="text-center space-y-2 relative z-10">
            <div className="text-lg font-black tracking-tighter uppercase">{config?.nombre_empresa || 'NOMBRE EMPRESA'}</div>
            <div className="font-bold">NIT: {config?.nit || 'NIT'}</div>
            
            <div className="py-1 border-y border-secondary-200 text-[10px] uppercase font-bold tracking-widest">
                {config?.responsable_iva ? 'RESPONSABLE DE IVA' : 'NO RESPONSABLE DE IVA'}
            </div>

            {config?.responsable_iva && config?.porcentaje_iva && (
              <div className="text-xs uppercase">IVA INC.: {config.porcentaje_iva}%</div>
            )}
            
            <div className="pt-2">
                <div className="font-bold">{config?.direccion || 'DIRECCIÓN'}</div>
                <div>{config?.ubicacion_geografica || 'UBICACIÓN'}</div>
                <div className="font-bold">
                TEL: {config?.telefonos.filter(t => t.trim()).join(' - ') || 'TELÉFONOS'}
          </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-dotted border-secondary-300">
                <div className="flex justify-between font-bold text-xs">
                    <span>CANT.</span>
                    <span>DESCRIPCIÓN</span>
                    <span>TOTAL</span>
                </div>
                <div className="mt-2 text-center text-secondary-400 italic text-[10px]">
                    ... detalle de la venta ...
        </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
