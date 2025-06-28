'use client';

import { useState } from 'react';
import { PersonalizacionItem, OpcionCaldo, OpcionPrincipio, OpcionProteina, OpcionBebida } from '@/types';

interface PersonalizacionDesayunoProps {
  onPersonalizacionChange: (personalizacion: PersonalizacionItem) => void;
  personalizacionInicial?: PersonalizacionItem;
}

export default function PersonalizacionDesayuno({ onPersonalizacionChange, personalizacionInicial }: PersonalizacionDesayunoProps) {
  const [personalizacion, setPersonalizacion] = useState<PersonalizacionItem>(
    personalizacionInicial || {}
  );

  // Opciones de caldos para desayunos
  const caldos: OpcionCaldo[] = [
    { id: 'pollo', nombre: 'Caldo de Pollo', precio_adicional: 0 },
    { id: 'costilla', nombre: 'Caldo de Costilla', precio_adicional: 0 },
    { id: 'campesino', nombre: 'Caldo Campesino', precio_adicional: 2000 },
    { id: 'bagre', nombre: 'Caldo de Bagre', precio_adicional: 3000 }
  ];

  // Opciones de proteínas para desayunos
  const proteinas: OpcionProteina[] = [
    { id: 'cerdo', nombre: 'Cerdo', precio_adicional: 0 },
    { id: 'huevos_revueltos', nombre: 'Huevos Revueltos', precio_adicional: 0 },
    { id: 'bistec_res', nombre: 'Bistec de Res', precio_adicional: 1000 },
    { id: 'pollo', nombre: 'Pollo', precio_adicional: 500 },
    { id: 'higado', nombre: 'Hígado', precio_adicional: 0 }
  ];

  // Opciones de bebidas para desayunos
  const bebidas: OpcionBebida[] = [
    { id: 'chocolate', nombre: 'Chocolate', precio_adicional: 0 },
    { id: 'chocolate_leche', nombre: 'Chocolate en Leche', precio_adicional: 1000 },
    { id: 'cafe', nombre: 'Café', precio_adicional: 0 },
    { id: 'cafe_leche', nombre: 'Café en Leche', precio_adicional: 800 },
    { id: 'agua_panela', nombre: 'Agua de Panela', precio_adicional: 0 }
  ];

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
