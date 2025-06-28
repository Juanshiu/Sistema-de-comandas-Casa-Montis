'use client';

import { useState } from 'react';
import { PersonalizacionItem, OpcionCaldo, OpcionPrincipio, OpcionProteina } from '@/types';

interface PersonalizacionAlmuerzoProps {
  onPersonalizacionChange: (personalizacion: PersonalizacionItem) => void;
  personalizacionInicial?: PersonalizacionItem;
}

export default function PersonalizacionAlmuerzo({ onPersonalizacionChange, personalizacionInicial }: PersonalizacionAlmuerzoProps) {
  const [personalizacion, setPersonalizacion] = useState<PersonalizacionItem>(
    personalizacionInicial || {}
  );

  // Opciones de sopas/caldos para almuerzos
  const caldos: OpcionCaldo[] = [
    { id: 'sopa_verduras', nombre: 'Sopa de Verduras', precio_adicional: 0 },
    { id: 'caldo_pollo', nombre: 'Caldo de Pollo', precio_adicional: 0 },
    { id: 'caldo_costilla', nombre: 'Caldo de Costilla', precio_adicional: 1000 },
    { id: 'caldo_bagre', nombre: 'Caldo de Bagre', precio_adicional: 3000 },
    { id: 'sancocho', nombre: 'Sancocho', precio_adicional: 2000 }
  ];

  // Opciones de principios para almuerzos
  const principios: OpcionPrincipio[] = [
    { id: 'frijol', nombre: 'Frijol', precio_adicional: 0 },
    { id: 'verduras_atun', nombre: 'Verduras con Atún', precio_adicional: 1500 },
    { id: 'verduras_salteadas', nombre: 'Verduras Salteadas', precio_adicional: 500 },
    { id: 'pasta_fria', nombre: 'Pasta Fría', precio_adicional: 1000 },
    { id: 'pure_papa', nombre: 'Puré de Papa', precio_adicional: 0 },
    { id: 'lentejas', nombre: 'Lentejas', precio_adicional: 0 },
    { id: 'arroz_coco', nombre: 'Arroz con Coco', precio_adicional: 1200 }
  ];

  // Opciones de proteínas para almuerzos
  const proteinas: OpcionProteina[] = [
    { id: 'pollo_asado', nombre: 'Pollo Asado', precio_adicional: 0 },
    { id: 'pollo_sudado', nombre: 'Pollo Sudado', precio_adicional: 0 },
    { id: 'cerdo_asado', nombre: 'Cerdo Asado', precio_adicional: 500 },
    { id: 'res_sudada', nombre: 'Carne de Res Sudada', precio_adicional: 1000 },
    { id: 'bistec_res', nombre: 'Bistec de Res', precio_adicional: 1500 },
    { id: 'pechuga_plancha', nombre: 'Pechuga a la Plancha', precio_adicional: 2000 },
    { id: 'higado_encebollado', nombre: 'Hígado Encebollado', precio_adicional: 0 },
    { id: 'sobrebarriga_salsa', nombre: 'Sobrebarriga en Salsa', precio_adicional: 2500 },
    { id: 'sobrebarriga_asada', nombre: 'Sobrebarriga Asada', precio_adicional: 2000 },
    { id: 'filete_tilapia', nombre: 'Filete de Tilapia', precio_adicional: 4000 }
  ];

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
