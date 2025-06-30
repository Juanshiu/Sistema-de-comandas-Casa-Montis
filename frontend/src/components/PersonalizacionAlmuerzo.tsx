'use client';

import { useState, useEffect } from 'react';
import { PersonalizacionItem, OpcionCaldo, OpcionPrincipio, OpcionProteina } from '@/types';
import { apiService } from '@/services/api';

interface PersonalizacionAlmuerzoProps {
  onPersonalizacionChange: (personalizacion: PersonalizacionItem) => void;
  personalizacionInicial?: PersonalizacionItem;
}

export default function PersonalizacionAlmuerzo({ onPersonalizacionChange, personalizacionInicial }: PersonalizacionAlmuerzoProps) {
  const [personalizacion, setPersonalizacion] = useState<PersonalizacionItem>(
    personalizacionInicial || {}
  );
  const [caldos, setCaldos] = useState<OpcionCaldo[]>([]);
  const [principios, setPrincipios] = useState<OpcionPrincipio[]>([]);
  const [proteinas, setProteinas] = useState<OpcionProteina[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarOpciones();
  }, []);

  const cargarOpciones = async () => {
    try {
      setLoading(true);
      const [caldosData, principiosData, proteinasData] = await Promise.all([
        apiService.getCaldos(),
        apiService.getPrincipios(),
        apiService.getProteinas()
      ]);
      
      setCaldos(caldosData);
      setPrincipios(principiosData);
      setProteinas(proteinasData);
    } catch (error) {
      console.error('Error al cargar opciones de personalización:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccion = (tipo: 'caldo' | 'principio' | 'proteina', opcion: any) => {
    const nuevaPersonalizacion = {
      ...personalizacion,
      [tipo]: opcion,
      precio_adicional: calcularPrecioAdicional({
        ...personalizacion,
        [tipo]: opcion
      })
    };
    
    setPersonalizacion(nuevaPersonalizacion);
    onPersonalizacionChange(nuevaPersonalizacion);
  };

  const calcularPrecioAdicional = (pers: PersonalizacionItem): number => {
    let total = 0;
    if (pers.caldo) total += pers.caldo.precio_adicional;
    if (pers.principio) total += pers.principio.precio_adicional;
    if (pers.proteina) total += pers.proteina.precio_adicional;
    return total;
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-secondary-600 mt-2">Cargando opciones de personalización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-800 mb-4">
        🍽️ Personalizar Almuerzo
      </h3>

      {/* Selección de Sopa/Caldo */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Seleccionar Sopa o Caldo
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {caldos.map((caldo) => (
            <button
              key={caldo.id}
              onClick={() => handleSeleccion('caldo', caldo)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                personalizacion.caldo?.id === caldo.id
                  ? 'border-blue-500 bg-blue-100 text-blue-800'
                  : 'border-gray-300 bg-white hover:border-blue-300'
              }`}
            >
              <div className="font-medium">{caldo.nombre}</div>
              {caldo.precio_adicional > 0 && (
                <div className="text-sm text-blue-600">
                  +${caldo.precio_adicional.toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selección de Principio */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Seleccionar Principio
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {principios.map((principio) => (
            <button
              key={principio.id}
              onClick={() => handleSeleccion('principio', principio)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                personalizacion.principio?.id === principio.id
                  ? 'border-blue-500 bg-blue-100 text-blue-800'
                  : 'border-gray-300 bg-white hover:border-blue-300'
              }`}
            >
              <div className="font-medium">{principio.nombre}</div>
              {principio.precio_adicional > 0 && (
                <div className="text-sm text-blue-600">
                  +${principio.precio_adicional.toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selección de Proteína */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Seleccionar Proteína
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {proteinas.map((proteina) => (
            <button
              key={proteina.id}
              onClick={() => handleSeleccion('proteina', proteina)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                personalizacion.proteina?.id === proteina.id
                  ? 'border-blue-500 bg-blue-100 text-blue-800'
                  : 'border-gray-300 bg-white hover:border-blue-300'
              }`}
            >
              <div className="font-medium">{proteina.nombre}</div>
              {proteina.precio_adicional > 0 && (
                <div className="text-sm text-blue-600">
                  +${proteina.precio_adicional.toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      {personalizacion.precio_adicional && personalizacion.precio_adicional > 0 && (
        <div className="p-3 bg-blue-100 rounded-lg border border-blue-300">
          <div className="text-sm font-medium text-blue-800">
            Costo adicional por personalización: +${personalizacion.precio_adicional.toLocaleString()}
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
        💡 <strong>Especialidades:</strong> Filete de tilapia y sobrebarriga tienen costo adicional por ser proteínas premium
      </div>
    </div>
  );
}
