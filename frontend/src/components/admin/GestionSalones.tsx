'use client';

import { useState, useEffect } from 'react';
import { Salon, Mesa } from '@/types';
import { apiService } from '@/services/api';

export default function GestionSalones() {
  const [salones, setSalones] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [salonEditando, setSalonEditando] = useState<Salon | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  });

  useEffect(() => {
    cargarSalones();
  }, []);

  const cargarSalones = async () => {
    try {
      setLoading(true);
      const salonesData = await apiService.getSalones();
      setSalones(salonesData);
    } catch (error) {
      console.error('Error al cargar salones:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (salon?: Salon) => {
    if (salon) {
      setSalonEditando(salon);
      setFormData({
        nombre: salon.nombre,
        descripcion: salon.descripcion || '',
        activo: salon.activo
      });
    } else {
      setSalonEditando(null);
      setFormData({
        nombre: '',
        descripcion: '',
        activo: true
      });
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setSalonEditando(null);
    setFormData({
      nombre: '',
      descripcion: '',
      activo: true
    });
  };

  const guardarSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const salonData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        activo: formData.activo
      };

      if (salonEditando) {
        await apiService.updateSalon(salonEditando.id, salonData);
      } else {
        await apiService.createSalon(salonData);
      }
      
      await cargarSalones();
      cerrarModal();
    } catch (error) {
      console.error('Error al guardar salón:', error);
      alert('Error al guardar el salón');
    }
  };

  const eliminarSalon = async (salon: Salon) => {
    if (!confirm(`¿Está seguro de eliminar el salón "${salon.nombre}"?\n\nNota: Solo se puede eliminar si no tiene mesas asociadas.`)) {
      return;
    }

    try {
      await apiService.deleteSalon(salon.id);
      await cargarSalones();
    } catch (error: any) {
      console.error('Error al eliminar salón:', error);
      alert(error.response?.data?.error || 'Error al eliminar el salón');
    }
  };

  const toggleActivo = async (salon: Salon) => {
    try {
      await apiService.updateSalon(salon.id, {
        ...salon,
        activo: !salon.activo
      });
      await cargarSalones();
    } catch (error) {
      console.error('Error al cambiar estado del salón:', error);
      alert('Error al cambiar el estado del salón');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-center mt-2">Cargando salones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          🏛️ Gestión de Salones
        </h2>
        <button
          onClick={() => abrirModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Nuevo Salón
        </button>
      </div>

      {/* Lista de salones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {salones.map((salon) => (
          <div
            key={salon.id}
            className={`p-4 rounded-lg border-2 transition-colors ${
              salon.activo
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{salon.nombre}</h3>
                {salon.descripcion && (
                  <p className="text-sm text-gray-600 mt-1">
                    {salon.descripcion}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Creado: {new Date(salon.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActivo(salon)}
                  className={`px-2 py-1 text-xs rounded ${
                    salon.activo
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                  title={salon.activo ? 'Desactivar' : 'Activar'}
                >
                  {salon.activo ? '👁️' : '👁️‍🗨️'}
                </button>
                <button
                  onClick={() => abrirModal(salon)}
                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                >
                  ✏️
                </button>
                <button
                  onClick={() => eliminarSalon(salon)}
                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  🗑️
                </button>
              </div>
            </div>
            <div className="mt-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                salon.activo
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {salon.activo ? '🟢 Activo' : '⚫ Inactivo'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {salones.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No hay salones registrados
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
              {salonEditando ? 'Editar Salón' : 'Nuevo Salón'}
            </h3>
            
            <form onSubmit={guardarSalon} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Salón *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: Salón Principal, Terraza, etc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Descripción opcional del salón"
                />
              </div>

              {salonEditando && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="activo" className="text-sm font-medium text-gray-700">
                    Salón activo
                  </label>
                </div>
              )}

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
                  {salonEditando ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
