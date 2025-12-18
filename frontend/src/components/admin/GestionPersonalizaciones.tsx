'use client';

import { useState, useEffect } from 'react';
import { OpcionCaldo, OpcionPrincipio, OpcionProteina, OpcionBebida } from '@/types';
import { apiService } from '@/services/api';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

type TipoPersonalizacion = 'categorias' | 'caldos' | 'principios' | 'proteinas' | 'bebidas';

interface PersonalizacionForm {
  nombre: string;
  precio_adicional: number;
}

interface CategoriaForm {
  nombre: string;
  descripcion: string;
  orden: number;
}

export default function GestionPersonalizaciones() {
  const [tipoActivo, setTipoActivo] = useState<TipoPersonalizacion>('categorias');
  const [items, setItems] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | number | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [formulario, setFormulario] = useState<PersonalizacionForm>({
    nombre: '',
    precio_adicional: 0
  });
  const [formularioCategoria, setFormularioCategoria] = useState<CategoriaForm>({
    nombre: '',
    descripcion: '',
    orden: 0
  });

  useEffect(() => {
    cargarCategorias();
  }, []);

  useEffect(() => {
    cargarItems();
  }, [tipoActivo]);

  const cargarCategorias = async () => {
    try {
      const response = await apiService.getCategoriasPersonalizacion();
      setCategorias(response || []);
      
      // Construir tabs dinámicamente
      const tiposDinamicos = [
        { id: 'categorias' as TipoPersonalizacion, label: 'Categorías', descripcion: 'Gestionar tipos de personalización' }
      ];
      
      // Agregar tabs para cada categoría activa
      response.forEach((cat: any) => {
        if (cat.activo) {
          tiposDinamicos.push({
            id: cat.nombre.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-') as TipoPersonalizacion,
            label: cat.nombre,
            descripcion: cat.descripcion || '',
            categoria_id: cat.id
          });
        }
      });
      
      setTipos(tiposDinamicos);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const cargarItems = async () => {
    try {
      setLoading(true);
      let response;
      
      if (tipoActivo === 'categorias') {
        response = await apiService.getCategoriasPersonalizacion();
        setCategorias(response || []);
        setItems([]);
      } else {
        // Cargar items según el tipo activo
        // Mapear nombres de categorías a las rutas API correspondientes
        if (tipoActivo.includes('caldo') || tipoActivo === 'caldos-sopas') {
          response = await apiService.getCaldos();
        } else if (tipoActivo.includes('principio')) {
          response = await apiService.getPrincipios();
        } else if (tipoActivo.includes('prote')) {
          response = await apiService.getProteinas();
        } else if (tipoActivo.includes('bebida')) {
          response = await apiService.getBebidas();
        } else {
          // Para categorías nuevas, por defecto cargar array vacío
          response = [];
        }
        
        setItems(response || []);
      }
      
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

  // Funciones para manejar categorías
  const iniciarCreacionCategoria = () => {
    setCreandoNuevo(true);
    setEditandoId(null);
    setFormularioCategoria({
      nombre: '',
      descripcion: '',
      orden: categorias.length
    });
  };

  const iniciarEdicionCategoria = (categoria: any) => {
    setEditandoId(categoria.id);
    setCreandoNuevo(false);
    setFormularioCategoria({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      orden: categoria.orden
    });
  };

  const cancelarEdicionCategoria = () => {
    setEditandoId(null);
    setCreandoNuevo(false);
    setFormularioCategoria({
      nombre: '',
      descripcion: '',
      orden: 0
    });
  };

  const guardarCategoria = async () => {
    if (!formularioCategoria.nombre.trim()) {
      setError('El nombre de la categoría es obligatorio');
      return;
    }

    try {
      setError(null);
      
      if (creandoNuevo) {
        await apiService.createCategoriaPersonalizacion(formularioCategoria);
      } else if (editandoId) {
        await apiService.updateCategoriaPersonalizacion(Number(editandoId), {
          ...formularioCategoria,
          activo: true
        });
      }

      await cargarCategorias();
      await cargarItems();
      cancelarEdicionCategoria();
    } catch (err) {
      setError('Error al guardar la categoría');
      console.error('Error:', err);
    }
  };

  const eliminarCategoria = async (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría? Las personalizaciones asociadas no se eliminarán, pero la categoría ya no estará disponible.')) {
      return;
    }

    try {
      await apiService.deleteCategoriaPersonalizacion(id);
      await cargarCategorias();
      await cargarItems();
    } catch (err) {
      setError('Error al eliminar la categoría');
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
          {tipoActual?.label} ({tipoActivo === 'categorias' ? categorias.length : items.length})
        </h3>
        <button
          onClick={tipoActivo === 'categorias' ? iniciarCreacionCategoria : iniciarCreacion}
          className="btn-primary flex items-center"
          disabled={creandoNuevo || editandoId !== null}
        >
          <Plus size={16} className="mr-2" />
          Agregar {tipoActivo === 'categorias' ? 'Categoría' : tipoActual?.label.slice(0, -1)}
        </button>
      </div>

      {/* Formulario de creación/edición */}
      {(creandoNuevo || editandoId !== null) && tipoActivo === 'categorias' && (
        <div className="card">
          <h4 className="text-lg font-semibold text-secondary-800 mb-4">
            {creandoNuevo ? 'Agregar Categoría' : 'Editar Categoría'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={formularioCategoria.nombre}
                onChange={(e) => setFormularioCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                className="input-field"
                placeholder="Ej: Carnes, Guarniciones, Salsas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Orden
              </label>
              <input
                type="number"
                value={formularioCategoria.orden}
                onChange={(e) => setFormularioCategoria(prev => ({ ...prev, orden: Number(e.target.value) }))}
                className="input-field"
                placeholder="0"
                min="0"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formularioCategoria.descripcion}
                onChange={(e) => setFormularioCategoria(prev => ({ ...prev, descripcion: e.target.value }))}
                className="input-field"
                rows={2}
                placeholder="Descripción opcional de la categoría"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelarEdicionCategoria}
              className="btn-secondary flex items-center"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </button>
            <button
              onClick={guardarCategoria}
              className="btn-primary flex items-center"
            >
              <Save size={16} className="mr-2" />
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Formulario de creación/edición para personalizaciones */}
      {(creandoNuevo || editandoId !== null) && tipoActivo !== 'categorias' && (
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

      {/* Lista de categorías */}
      {tipoActivo === 'categorias' && (
        <div className="card">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : categorias.length === 0 ? (
            <p className="text-secondary-600 text-center py-8">
              No hay categorías de personalización registradas
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
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {categorias.map((categoria) => (
                    <tr key={categoria.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-secondary-900">
                          {categoria.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-secondary-600">
                          {categoria.descripcion || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-secondary-900">
                          {categoria.orden}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => iniciarEdicionCategoria(categoria)}
                            disabled={creandoNuevo || editandoId !== null}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => eliminarCategoria(categoria.id)}
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
      )}

      {/* Lista de items de personalización */}
      {tipoActivo !== 'categorias' && (
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
      )}
    </div>
  );
}
