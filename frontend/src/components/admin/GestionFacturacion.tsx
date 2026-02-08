'use client';

import { useState, useEffect } from 'react';
import { FileText, Building2, Printer, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import apiService from '@/services/api';
import { ConfiguracionFacturacion } from '@/types';
import { printingService } from '@/services/printingService';

export default function GestionFacturacion() {
  const [config, setConfig] = useState<ConfiguracionFacturacion | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para impresión local
  const [pluginStatus, setPluginStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');

  useEffect(() => {
    cargarConfiguracion();
    checkPlugin();
    
    // Cargar impresora guardada
    const savedPrinter = localStorage.getItem('printer_cocina_local');
    if (savedPrinter) setSelectedPrinter(savedPrinter);
    
    // Cargar ancho de papel guardado
    const savedPaperWidth = localStorage.getItem('paper_width_cocina') as '58mm' | '80mm';
    if (savedPaperWidth) setPaperWidth(savedPaperWidth);
    
    // Cargar tamaño de fuente guardado
    const savedFontSize = localStorage.getItem('font_size_cocina') as 'small' | 'normal' | 'large';
    if (savedFontSize) setFontSize(savedFontSize);
  }, []);

  const checkPlugin = async () => {
    setPluginStatus('checking');
    const isOnline = await printingService.checkStatus();
    setPluginStatus(isOnline ? 'online' : 'offline');
    
    if (isOnline) {
      const printerList = await printingService.getPrinters();
      setPrinters(printerList);
    }
  };

  const handlePrinterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const printer = e.target.value;
    setSelectedPrinter(printer);
    localStorage.setItem('printer_cocina_local', printer);
  };

  const handlePaperWidthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const width = e.target.value as '58mm' | '80mm';
    setPaperWidth(width);
    localStorage.setItem('paper_width_cocina', width);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = e.target.value as 'small' | 'normal' | 'large';
    setFontSize(size);
    localStorage.setItem('font_size_cocina', size);
  };

  const testPrinter = async () => {
    if (!selectedPrinter) return;
    
    setTestingPrinter(true);
    
    // Ancho base según tipo de papel
    let anchoBase = paperWidth === '58mm' ? 32 : 48;
    
    // Ajustar ancho según tamaño de fuente
    // Fuente 'large' usa doble ancho, por lo que necesitamos la mitad de caracteres
    const anchoCaracteres = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase;
    const separador = '='.repeat(anchoCaracteres);
    
    // Comandos ESC/POS para tamaño de fuente
    const fontSizeCmd = fontSize === 'small' ? '\x1D\x21\x00' : 
                        fontSize === 'large' ? '\x1D\x21\x11' : 
                        '\x1D\x21\x00';
    
    const content = `${fontSizeCmd}
${separador}
${'PRUEBA DE IMPRESION'.padStart((anchoCaracteres + 19) / 2)}
${separador}
La impresora ${selectedPrinter}
esta configurada correctamente.

Ancho: ${paperWidth} (${anchoCaracteres} car.)
Fuente: ${fontSize === 'small' ? 'Pequeña' : fontSize === 'large' ? 'Grande' : 'Normal'}
Fecha: ${new Date().toLocaleString()}
${separador}
    `;
    
    await printingService.printRaw(content, selectedPrinter);
    setTestingPrinter(false);
  };

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

      {/* Configuración de Impresora Local */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
            <Printer size={20} className="text-primary-600" />
            Configuración de Impresora (Cocina/Ticket)
          </h3>
          <button 
            onClick={checkPlugin}
            className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-secondary-50 rounded-full transition-colors"
            title="Verificar conexión"
          >
            <RefreshCw size={18} className={pluginStatus === 'checking' ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Estado del Plugin - Ancho completo */}
          <div className={`p-4 rounded-lg border ${
            pluginStatus === 'online' ? 'bg-green-50 border-green-200' : 
            pluginStatus === 'offline' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              {pluginStatus === 'online' ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : pluginStatus === 'offline' ? (
                <XCircle className="text-red-600" size={24} />
              ) : (
                <RefreshCw className="text-gray-400 animate-spin" size={24} />
              )}
              <div>
                <p className="font-medium text-secondary-900">
                  {pluginStatus === 'online' ? 'Plugin de Impresión Conectado' : 
                   pluginStatus === 'offline' ? 'Plugin No Detectado' : 'Verificando conexión...'}
                </p>
                <p className="text-sm text-secondary-600">
                  {pluginStatus === 'online' 
                    ? 'El sistema puede enviar impresiones locales.' 
                    : 'Asegúrese de ejecutar el plugin local en este equipo.'}
                </p>
              </div>
            </div>
          </div>

          {/* Grid para Impresora, Ancho de Papel y Tamaño de Fuente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Selección de Impresora */}
            <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Seleccionar Impresora
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPrinter}
                onChange={handlePrinterChange}
                disabled={pluginStatus !== 'online'}
                className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 disabled:bg-gray-100"
              >
                <option value="">-- Seleccione una impresora --</option>
                {printers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={testPrinter}
                disabled={!selectedPrinter || testingPrinter || pluginStatus !== 'online'}
                className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 disabled:opacity-50 font-medium"
              >
                {testingPrinter ? '...' : 'Probar'}
              </button>
            </div>
            {pluginStatus === 'online' && printers.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No se encontraron impresoras. Verifique que estén instaladas en Windows.
              </p>
            )}
          </div>

            {/* Ancho de Papel */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Ancho de Papel
              </label>
              <select
                value={paperWidth}
                onChange={handlePaperWidthChange}
                className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="58mm">58mm (POS pequeño)</option>
                <option value="80mm">80mm (POS estándar)</option>
              </select>
              <p className="text-xs text-secondary-500 mt-1">
                {(() => {
                  const anchoBase = paperWidth === '58mm' ? 32 : 48;
                  const anchoReal = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase;
                  return fontSize === 'large' ? `${anchoReal} caracteres (fuente grande)` : `${anchoBase} caracteres`;
                })()}
              </p>
            </div>
          </div>

          {/* Tamaño de Fuente */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Tamaño de Fuente
            </label>
            <select
              value={fontSize}
              onChange={handleFontSizeChange}
              className="block w-full rounded-lg border-secondary-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="small">Pequeña (más líneas)</option>
              <option value="normal">Normal (recomendado)</option>
              <option value="large">Grande (más legible)</option>
            </select>
            <p className="text-xs text-secondary-500 mt-1">
              {fontSize === 'small' ? 'Compacto' : fontSize === 'large' ? 'Texto ampliado' : 'Tamaño estándar'}
            </p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 text-sm text-blue-800">
          <p>
            <strong>Comandas de cocina:</strong> Se imprimirán con ancho {paperWidth} 
            ({(() => {
              const anchoBase = paperWidth === '58mm' ? 32 : 48;
              const anchoReal = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase;
              return anchoReal;
            })()} caracteres efectivos) y fuente {fontSize === 'small' ? 'pequeña' : fontSize === 'large' ? 'grande (x2)' : 'normal'}.
          </p>
        </div>
      </div>

      {/* Vista previa Estilo Recibo */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8">
        <h3 className="text-lg font-bold text-secondary-900 mb-6 flex items-center gap-2">
            <FileText size={20} className="text-primary-600" />
            Diseño de Encabezado (Recibo/Factura)
        </h3>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-3 text-yellow-800">
        <Building2 size={20} className="flex-shrink-0" />
        <p className="text-sm">
          Para modificar estos datos, diríjase a la sección de <strong>Empresa</strong> en el menú lateral.
        </p>
      </div>
        
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
                <div>
                  {config?.departamento && config?.ciudad 
                    ? `${config.departamento} - ${config.ciudad}`
                    : config?.ubicacion_geografica || 'UBICACIÓN'}
                </div>
                <div className="font-bold">
                  TEL: {(() => {
                    const tels = [];
                    if (config?.telefonos?.[0]) tels.push(config.telefonos[0]);
                    if (config?.telefono2?.trim()) tels.push(config.telefono2);
                    return tels.length > 0 ? tels.join(' - ') : 'TELÉFONOS';
                  })()}
                </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-dotted border-secondary-300">
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-1 font-bold text-xs">
                    <span>CANT</span>
                    <span>DESCRIPCIÓN</span>
                    <span>V.UNIT</span>
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
