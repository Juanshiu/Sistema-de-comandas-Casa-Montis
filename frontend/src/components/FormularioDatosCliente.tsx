'use client';

import { useState, useEffect } from 'react';
import { DatosCliente } from '@/types';
import { User, MapPin, Phone, ShoppingBag, Truck } from 'lucide-react';

interface FormularioDatosClienteProps {
  datosCliente?: DatosCliente;
  onDatosClienteChange: (datos: DatosCliente) => void;
}

export default function FormularioDatosCliente({ 
  datosCliente,
  onDatosClienteChange
}: FormularioDatosClienteProps) {
  
  const [nombre, setNombre] = useState(datosCliente?.nombre || '');
  const [direccion, setDireccion] = useState(datosCliente?.direccion || '');
  const [telefono, setTelefono] = useState(datosCliente?.telefono || '');
  const [esParaLlevar, setEsParaLlevar] = useState(datosCliente?.es_para_llevar || false);

  // Actualizar datos del cliente cuando cambien los campos
  useEffect(() => {
    if (nombre.trim()) {
      onDatosClienteChange({
        nombre: nombre.trim(),
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        es_para_llevar: esParaLlevar
      });
    }
  }, [nombre, direccion, telefono, esParaLlevar]);

  const handleEsParaLlevarChange = (checked: boolean) => {
    setEsParaLlevar(checked);
    // Si es para llevar, limpiar la dirección
    if (checked) {
      setDireccion('');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center mb-4">
        {esParaLlevar ? (
          <ShoppingBag className="text-green-600 mr-2" size={24} />
        ) : (
          <Truck className="text-green-600 mr-2" size={24} />
        )}
        <h2 className="text-xl font-semibold text-secondary-800">
          {esParaLlevar ? 'Datos del Cliente - Para Llevar' : 'Datos del Cliente - Domicilio'}
        </h2>
      </div>
      
      <p className="text-secondary-600 mb-6">
        Ingrese los datos del cliente para el pedido
      </p>

      <div className="space-y-6">
        {/* Toggle Para Llevar / Domicilio */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={esParaLlevar}
              onChange={(e) => handleEsParaLlevarChange(e.target.checked)}
              className="w-5 h-5 text-green-600 rounded focus:ring-green-500 focus:ring-2"
            />
            <div className="ml-3">
              <span className="font-medium text-green-800 flex items-center">
                <ShoppingBag size={18} className="mr-2" />
                Cliente recoge el pedido en el restaurante (Para Llevar)
              </span>
              <span className="text-sm text-green-600 block mt-1">
                {esParaLlevar 
                  ? 'El cliente pasará a recoger su pedido' 
                  : 'El pedido será entregado a domicilio'
                }
              </span>
            </div>
          </label>
        </div>

        {/* Nombre del Cliente */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            <User size={16} className="inline mr-1" />
            Nombre del Cliente *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo del cliente"
            className="input-field"
            required
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            <Phone size={16} className="inline mr-1" />
            Teléfono {!esParaLlevar && '*'}
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Número de contacto"
            className="input-field"
            required={!esParaLlevar}
          />
          <p className="text-xs text-secondary-500 mt-1">
            {esParaLlevar 
              ? 'Opcional - para contactar al cliente si es necesario'
              : 'Necesario para confirmar la entrega'
            }
          </p>
        </div>

        {/* Dirección (solo si no es para llevar) */}
        {!esParaLlevar && (
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              <MapPin size={16} className="inline mr-1" />
              Dirección de Entrega *
            </label>
            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección completa con referencias"
              rows={3}
              className="input-field"
              required
            />
            <p className="text-xs text-secondary-500 mt-1">
              Incluya referencias o puntos de ubicación para facilitar la entrega
            </p>
          </div>
        )}

        {/* Mesero que toma el pedido - ELIMINADO */}

        {/* Resumen */}
        {nombre.trim() && (
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-medium text-primary-800 mb-2">Resumen del Pedido</h3>
            <div className="text-sm text-primary-700 space-y-1">
              <p><strong>Tipo:</strong> {esParaLlevar ? 'Para Llevar 🛍️' : 'Domicilio 🚚'}</p>
              <p><strong>Cliente:</strong> {nombre}</p>
              {telefono && <p><strong>Teléfono:</strong> {telefono}</p>}
              {!esParaLlevar && direccion && <p><strong>Dirección:</strong> {direccion}</p>}
              {/* {mesero && <p><strong>Atendido por:</strong> {mesero}</p>} */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
