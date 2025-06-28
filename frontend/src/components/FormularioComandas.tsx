'use client';

import { useState } from 'react';
import { Mesa, FormularioComanda, ItemComanda, PasoComanda } from '@/types';
import SeleccionMesaYMesero from './SeleccionMesaYMesero';
import SeleccionTipoServicio from './SeleccionTipoServicio';
import SeleccionProductos from './SeleccionProductos';
import ResumenComanda from './ResumenComanda';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export default function FormularioComandas() {
  const [pasoActual, setPasoActual] = useState(0);
  const [formulario, setFormulario] = useState<FormularioComanda>({
    mesas: [],
    items: [],
    mesero: ''
  });

  const pasos: PasoComanda[] = [
    { paso: 0, titulo: 'Seleccionar Mesa', completado: formulario.mesas.length > 0 },
    { paso: 1, titulo: 'Tipo de Servicio', completado: !!formulario.tipo_servicio },
    { paso: 2, titulo: 'Seleccionar Productos', completado: formulario.items.length > 0 },
    { paso: 3, titulo: 'Resumen y Envío', completado: false }
  ];

  const handleMesasSelect = (mesas: Mesa[]) => {
    setFormulario(prev => ({ ...prev, mesas }));
  };

  const handleMeseroChange = (mesero: string) => {
    setFormulario(prev => ({ ...prev, mesero }));
  };

  const handleTipoServicioSelect = (tipo: FormularioComanda['tipo_servicio']) => {
    setFormulario(prev => ({ ...prev, tipo_servicio: tipo }));
  };

  const handleProductosChange = (items: ItemComanda[]) => {
    setFormulario(prev => ({ ...prev, items }));
  };

  const handleObservacionesChange = (observaciones: string) => {
    setFormulario(prev => ({ ...prev, observaciones_generales: observaciones }));
  };

  const puedeAvanzar = () => {
    switch (pasoActual) {
      case 0: return formulario.mesas.length > 0 && formulario.mesero.trim() !== '';
      case 1: return !!formulario.tipo_servicio;
      case 2: return formulario.items.length > 0;
      case 3: return false; // Último paso
      default: return false;
    }
  };

  const siguientePaso = () => {
    if (puedeAvanzar() && pasoActual < pasos.length - 1) {
      setPasoActual(prev => prev + 1);
    }
  };

  const pasoAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(prev => prev - 1);
    }
  };

  const renderPasoActual = () => {
    switch (pasoActual) {
      case 0:
        return (
          <SeleccionMesaYMesero 
            mesasSeleccionadas={formulario.mesas}
            onMesasChange={handleMesasSelect}
            mesero={formulario.mesero}
            onMeseroChange={handleMeseroChange}
          />
        );
      case 1:
        return (
          <SeleccionTipoServicio
            onTipoSelect={handleTipoServicioSelect}
            tipoSeleccionado={formulario.tipo_servicio}
          />
        );
      case 2:
        return (
          <SeleccionProductos
            tipoServicio={formulario.tipo_servicio!}
            items={formulario.items}
            onItemsChange={handleProductosChange}
          />
        );
      case 3:
        return (
          <ResumenComanda
            formulario={formulario}
            onObservacionesChange={handleObservacionesChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-secondary-800 mb-2">
            Casa Montis - Sistema de Comandas
          </h1>
          <p className="text-secondary-600">
            Complete los pasos para crear una nueva comanda
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="card mb-6">
          {/* Vista desktop */}
          <div className="hidden md:flex items-center justify-between">
            {pasos.map((paso, index) => (
              <div key={paso.paso} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                  ${index === pasoActual 
                    ? 'border-primary-500 bg-primary-500 text-white' 
                    : paso.completado
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-secondary-300 bg-white text-secondary-500'
                  }
                `}>
                  {paso.completado ? (
                    <Check size={20} />
                  ) : (
                    <span className="font-semibold">{paso.paso + 1}</span>
                  )}
                </div>
                <div className="ml-3">
                  <div className={`font-medium ${
                    index === pasoActual 
                      ? 'text-primary-600' 
                      : paso.completado
                      ? 'text-green-600'
                      : 'text-secondary-500'
                  }`}>
                    {paso.titulo}
                  </div>
                </div>
                {index < pasos.length - 1 && (
                  <div className={`mx-4 w-16 h-0.5 ${
                    paso.completado ? 'bg-green-500' : 'bg-secondary-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Vista móvil */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-secondary-800">
                Paso {pasoActual + 1} de {pasos.length}
              </div>
              <div className="flex space-x-1">
                {pasos.map((paso, index) => (
                  <div
                    key={paso.paso}
                    className={`w-3 h-3 rounded-full ${
                      index === pasoActual
                        ? 'bg-primary-500'
                        : paso.completado
                        ? 'bg-green-500'
                        : 'bg-secondary-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="bg-secondary-50 rounded-lg p-3 border-l-4 border-primary-500">
              <div className="font-medium text-primary-600">
                {pasos[pasoActual].titulo}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido del paso actual */}
        <div className="mb-6">
          {renderPasoActual()}
        </div>

        {/* Botones de navegación */}
        <div className="flex justify-between">
          <button
            onClick={pasoAnterior}
            disabled={pasoActual === 0}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ChevronLeft size={20} className="mr-2" />
            Anterior
          </button>

          {pasoActual < pasos.length - 1 ? (
            <button
              onClick={siguientePaso}
              disabled={!puedeAvanzar()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Siguiente
              <ChevronRight size={20} className="ml-2" />
            </button>
          ) : (
            <div></div>
          )}
        </div>
      </div>
    </div>
  );
}
