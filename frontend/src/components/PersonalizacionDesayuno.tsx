'use client';

import { useState, useEffect } from 'react';
import { PersonalizacionItem, OpcionCaldo, OpcionProteina, OpcionBebida } from '@/types';
import { apiService } from '@/services/api';

interface PersonalizacionDesayunoProps {
  onPersonalizacionChange: (personalizacion: PersonalizacionItem) => void;
  personalizacionInicial?: PersonalizacionItem;
}

export default function PersonalizacionDesayuno({ onPersonalizacionChange, personalizacionInicial }: PersonalizacionDesayunoProps) {
  const [personalizacion, setPersonalizacion] = useState<PersonalizacionItem>(
    personalizacionInicial || {}
  );
  const [caldos, setCaldos] = useState<OpcionCaldo[]>([]);
  const [proteinas, setProteinas] = useState<OpcionProteina[]>([]);
  const [bebidas, setBebidas] = useState<OpcionBebida[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarOpciones();
  }, []);

  const cargarOpciones = async () => {
    try {
      setLoading(true);
      const [caldosData, proteinasData, bebidasData] = await Promise.all([
        apiService.getCaldos(),
        apiService.getProteinas(),
        apiService.getBebidas()
      ]);
      
      setCaldos(caldosData);
      setProteinas(proteinasData);
      setBebidas(bebidasData);
    } catch (error) {
      console.error('Error al cargar opciones de personalización:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccion = (tipo: 'caldo' | 'proteina' | 'bebida', opcion: any) => {
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
    if (pers.proteina) total += pers.proteina.precio_adicional;
    if (pers.bebida) total += pers.bebida.precio_adicional;
    return total;
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-secondary-600 mt-2">Cargando opciones de personalización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
      <h3 className="text-lg font-semibold text-orange-800 mb-4">
        🌅 Personalizar Desayuno
      </h3>

      {/* Selección de Caldo */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Seleccionar Caldo
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {caldos.map((caldo) => (
            <button
              key={caldo.id}
              onClick={() => handleSeleccion('caldo', caldo)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                personalizacion.caldo?.id === caldo.id
                  ? 'border-orange-500 bg-orange-100 text-orange-800'
                  : 'border-gray-300 bg-white hover:border-orange-300'
              }`}
            >
              <div className="font-medium">{caldo.nombre}</div>
              {caldo.precio_adicional > 0 && (
                <div className="text-sm text-orange-600">
                  +${caldo.precio_adicional.toLocaleString()}
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
                  ? 'border-orange-500 bg-orange-100 text-orange-800'
                  : 'border-gray-300 bg-white hover:border-orange-300'
              }`}
            >
              <div className="font-medium">{proteina.nombre}</div>
              {proteina.precio_adicional > 0 && (
                <div className="text-sm text-orange-600">
                  +${proteina.precio_adicional.toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selección de Bebida */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Seleccionar Bebida
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {bebidas.map((bebida) => (
            <button
              key={bebida.id}
              onClick={() => handleSeleccion('bebida', bebida)}
              className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                personalizacion.bebida?.id === bebida.id
                  ? 'border-orange-500 bg-orange-100 text-orange-800'
                  : 'border-gray-300 bg-white hover:border-orange-300'
              }`}
            >
              <div className="font-medium">{bebida.nombre}</div>
              {bebida.precio_adicional > 0 && (
                <div className="text-sm text-orange-600">
                  +${bebida.precio_adicional.toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen */}
      {personalizacion.precio_adicional && personalizacion.precio_adicional > 0 && (
        <div className="p-3 bg-orange-100 rounded-lg border border-orange-300">
          <div className="text-sm font-medium text-orange-800">
            Costo adicional por personalización: +${personalizacion.precio_adicional.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
