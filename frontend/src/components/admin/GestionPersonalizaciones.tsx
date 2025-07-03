'use client';

import { useState, useEffect } from 'react';
import { OpcionCaldo, OpcionPrincipio, OpcionProteina, OpcionBebida } from '@/types';
import { apiService } from '@/services/api';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

type TipoPersonalizacion = 'caldos' | 'principios' | 'proteinas' | 'bebidas';

interface PersonalizacionForm {
  nombre: string;
  precio_adicional: number;
}

export default function GestionPersonalizaciones() {
  const [tipoActivo, setTipoActivo] = useState<TipoPersonalizacion>('caldos');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [formulario, setFormulario] = useState<PersonalizacionForm>({
    nombre: '',
    precio_adicional: 0
  });

  const tipos = [
    { id: 'caldos' as TipoPersonalizacion, label: 'Caldos/Sopas', descripcion: 'Para almuerzos y desayunos' },
    { id: 'principios' as TipoPersonalizacion, label: 'Principios', descripcion: 'Solo para almuerzos' },
    { id: 'proteinas' as TipoPersonalizacion, label: 'Proteínas', descripcion: 'Para almuerzos y desayunos' },
    { id: 'bebidas' as TipoPersonalizacion, label: 'Bebidas', descripcion: 'Solo para desayunos' }
  ];

  useEffect(() => {
    cargarItems();
  }, [tipoActivo]);

  const cargarItems = async () => {
    try {
      setLoading(true);
      let response;
      
      switch (tipoActivo) {
        case 'caldos':
          response = await apiService.getCaldos();
          break;
        case 'principios':
          response = await apiService.getPrincipios();
          break;
        case 'proteinas':
          response = await apiService.getProteinas();
          break;
        case 'bebidas':
          response = await apiService.getBebidas();
          break;
      }
      
      setItems(response || []);
      setError(null);
    } catch (err) {
      setError(`Error al cargar ${tipoActivo}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const iniciarCreacion = () => {
    setCreandoNuevo(true);
    setEditandoId(null);
    setFormulario({
      nombre: '',
      precio_adicional: 0
    });
  };

  const iniciarEdicion = (item: any) => {
    setEditandoId(item.id);
    setCreandoNuevo(false);
    setFormulario({
      nombre: item.nombre,
      precio_adicional: item.precio_adicional
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setCreandoNuevo(false);
    setFormulario({
      nombre: '',
      precio_adicional: 0
    });
  };

  const guardarItem = async () => {
    if (!formulario.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (formulario.precio_adicional < 0) {
      setError('El precio adicional debe ser mayor o igual a 0');
      return;
    }

    try {
      setError(null);
      
      if (creandoNuevo) {
        switch (tipoActivo) {
          case 'caldos':
            await apiService.createCaldo(formulario);
            break;
          case 'principios':
            await apiService.createPrincipio(formulario);
            break;
          case 'proteinas':
            await apiService.createProteina(formulario);
            break;
          case 'bebidas':
            await apiService.createBebida(formulario);
            break;
        }
      } else if (editandoId) {
        switch (tipoActivo) {
          case 'caldos':
            await apiService.updateCaldo(editandoId, formulario);
            break;
          case 'principios':
            await apiService.updatePrincipio(editandoId, formulario);
            break;
          case 'proteinas':
            await apiService.updateProteina(editandoId, formulario);
            break;
          case 'bebidas':
            await apiService.updateBebida(editandoId, formulario);
            break;
        }
      }

      await cargarItems();
      cancelarEdicion();
    } catch (err) {
      setError('Error al guardar el item');
      console.error('Error:', err);
    }
  };

  const eliminarItem = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este item?')) {
      return;
    }

    try {
      switch (tipoActivo) {
        case 'caldos':
          await apiService.deleteCaldo(id);
          break;
        case 'principios':
          await apiService.deletePrincipio(id);
          break;
        case 'proteinas':
          await apiService.deleteProteina(id);
          break;
        case 'bebidas':
          await apiService.deleteBebida(id);
          break;
      }
      
      await cargarItems();
    } catch (err) {
      setError('Error al eliminar el item');
      console.error('Error:', err);
    }
  };

  const tipoActual = tipos.find(t => t.id === tipoActivo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-secondary-800 mb-2">Gestión de Personalizaciones</h2>
        <p className="text-secondary-600">
          Administra las opciones de personalización para almuerzos y desayunos
        </p>
      </div>

      {/* Pestañas */}
      <div className="border-b border-secondary-200">
        <nav className="flex space-x-8">
          {tipos.map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setTipoActivo(tipo.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${tipoActivo === tipo.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                }
              `}
            >
              {tipo.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Info del tipo actual */}
      {tipoActual && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            <strong>{tipoActual.label}:</strong> {tipoActual.descripcion}
          </p>
        </div>
      )}

      {/* Botón crear */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-secondary-800">
          {tipoActual?.label} ({items.length})
        </h3>
        <button
          onClick={iniciarCreacion}
          className="btn-primary flex items-center"
          disabled={creandoNuevo || editandoId !== null}
        >
          <Plus size={16} className="mr-2" />
          Agregar {tipoActual?.label.slice(0, -1)}
        </button>
      </div>

      {/* Formulario de creación/edición */}
      {(creandoNuevo || editandoId !== null) && (
        <div className="card">
          <h4 className="text-lg font-semibold text-secondary-800 mb-4">
            {creandoNuevo ? `Agregar ${tipoActual?.label.slice(0, -1)}` : `Editar ${tipoActual?.label.slice(0, -1)}`}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formulario.nombre}
                onChange={(e) => setFormulario(prev => ({ ...prev, nombre: e.target.value }))}
                className="input-field"
                placeholder={`Nombre del ${tipoActual?.label.slice(0, -1).toLowerCase()}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Precio Adicional
              </label>
              <input
                type="number"
                value={formulario.precio_adicional}
                onChange={(e) => setFormulario(prev => ({ ...prev, precio_adicional: Number(e.target.value) }))}
                className="input-field"
                placeholder="0"
                min="0"
                step="500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelarEdicion}
              className="btn-secondary flex items-center"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </button>
            <button
              onClick={guardarItem}
              className="btn-primary flex items-center"
            >
              <Save size={16} className="mr-2" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Lista de items */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : items.length === 0 ? (
          <p className="text-secondary-600 text-center py-8">
            No hay {tipoActual?.label.toLowerCase()} registrados
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Precio Adicional
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-secondary-900">
                        {item.nombre}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-900">
                        {item.precio_adicional > 0 
                          ? `+$${item.precio_adicional.toLocaleString()}`
                          : 'Sin costo adicional'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => iniciarEdicion(item)}
                          disabled={creandoNuevo || editandoId !== null}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => eliminarItem(item.id)}
                          disabled={creandoNuevo || editandoId !== null}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
