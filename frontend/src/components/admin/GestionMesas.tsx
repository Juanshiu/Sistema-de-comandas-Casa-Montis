'use client';

import { useState, useEffect } from 'react';
import { Mesa, Salon } from '@/types';
import { apiService } from '@/services/api';

export default function GestionMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [salones, setSalones] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mesaEditando, setMesaEditando] = useState<Mesa | null>(null);
  const [formData, setFormData] = useState({
    numero: '',
    capacidad: 1,
    salon_id: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [mesasData, salonesData] = await Promise.all([
        apiService.getMesas(),
        apiService.getSalones()
      ]);
      setMesas(mesasData);
      setSalones(salonesData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (mesa?: Mesa) => {
    if (mesa) {
      setMesaEditando(mesa);
      setFormData({
        numero: mesa.numero,
        capacidad: mesa.capacidad,
        salon_id: mesa.salon_id?.toString() || ''
      });
    } else {
      setMesaEditando(null);
      setFormData({
        numero: '',
        capacidad: 1,
        salon_id: ''
      });
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setMesaEditando(null);
    setFormData({
      numero: '',
      capacidad: 1,
      salon_id: ''
    });
  };

  const guardarMesa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const mesaData = {
        numero: formData.numero.trim(), // Mantener como string
        capacidad: formData.capacidad,
        salon_id: formData.salon_id ? parseInt(formData.salon_id) : undefined
      };

      if (mesaEditando) {
        await apiService.updateMesa(mesaEditando.id, mesaData);
      } else {
        await apiService.createMesa(mesaData);
      }
      
      await cargarDatos();
      cerrarModal();
    } catch (error) {
      console.error('Error al guardar mesa:', error);
      alert('Error al guardar la mesa. Verifique que el número no esté duplicado.');
    }
  };

  const eliminarMesa = async (mesa: Mesa) => {
    if (!confirm(`¿Está seguro de eliminar la mesa ${mesa.numero}?`)) {
      return;
    }

    try {
      await apiService.deleteMesa(mesa.id);
      await cargarDatos();
    } catch (error: any) {
      console.error('Error al eliminar mesa:', error);
      alert(error.response?.data?.error || 'Error al eliminar la mesa');
    }
  };

  const obtenerNombreSalon = (mesa: Mesa) => {
    // Usar el nombre del salón que viene del JOIN en la API
    return mesa.salon || 'Sin salón';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-center mt-2">Cargando mesas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          🪑 Gestión de Mesas
        </h2>
        <button
          onClick={() => abrirModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Nueva Mesa
        </button>
      </div>

      {/* Lista de mesas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mesas.map((mesa) => (
          <div
            key={mesa.id}
            className={`p-4 rounded-lg border-2 transition-colors ${
              mesa.ocupada
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">Mesa {mesa.numero}</h3>
                <p className="text-sm text-gray-600">
                  Capacidad: {mesa.capacidad} personas
                </p>
                <p className="text-sm text-gray-600">
                  Salón: {obtenerNombreSalon(mesa)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => abrirModal(mesa)}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  title="Editar mesa"
                >
                  ✏️
                </button>
                <button
                  onClick={() => eliminarMesa(mesa)}
                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                  title="Eliminar mesa"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                mesa.ocupada
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {mesa.ocupada ? '🔴 Ocupada' : '🟢 Disponible'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {mesas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay mesas registradas
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cerrarModal();
            }
          }}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {mesaEditando ? 'Editar Mesa' : 'Nueva Mesa'}
            </h3>
            
            <form onSubmit={guardarMesa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Mesa
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 1, 1-1, 2-A, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad (personas)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.capacidad}
                  onChange={(e) => setFormData({ ...formData, capacidad: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salón
                </label>
                <select
                  value={formData.salon_id}
                  onChange={(e) => setFormData({ ...formData, salon_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Sin salón asignado</option>
                  {salones.filter(s => s.activo).map(salon => (
                    <option key={salon.id} value={salon.id}>
                      {salon.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {mesaEditando ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
