'use client';

import { useState, useEffect } from 'react';
import { Producto, CategoriaProducto } from '@/types';
import { apiService } from '@/services/api';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface ProductoForm {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  disponible: boolean;
  tiene_personalizacion: boolean;
  personalizaciones_habilitadas: string[];
}

export default function GestionProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState<string | 'todas'>('todas');
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([]);
  const [categoriasPersonalizacion, setCategoriasPersonalizacion] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [formulario, setFormulario] = useState<ProductoForm>({
    nombre: '',
    descripcion: '',
    precio: 0,
    categoria: 'otros',
    disponible: true,
    tiene_personalizacion: false,
    personalizaciones_habilitadas: []
  });

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
    cargarCategoriasPersonalizacion();
  }, []);

  useEffect(() => {
    // Filtrar productos cuando cambien los productos o el filtro
    if (filtroCategoria === 'todas') {
      setProductosFiltrados(productos);
    } else {
      setProductosFiltrados(productos.filter(producto => producto.categoria === filtroCategoria));
    }
  }, [productos, filtroCategoria]);

  const cargarCategorias = async () => {
    try {
      const response = await apiService.getCategorias();
      setCategoriasDisponibles(response);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  };

  const cargarCategoriasPersonalizacion = async () => {
    try {
      const response = await apiService.getCategoriasPersonalizacion();
      setCategoriasPersonalizacion(response);
    } catch (err) {
      console.error('Error al cargar categorías de personalización:', err);
    }
  };

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllProductos();
      setProductos(response);
      setError(null);
    } catch (err) {
      setError('Error al cargar los productos');
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
      descripcion: '',
      precio: 0,
      categoria: 'otros',
      disponible: true,
      tiene_personalizacion: false,
      personalizaciones_habilitadas: []
    });
  };

  const iniciarEdicion = (producto: Producto) => {
    setEditandoId(producto.id);
    setCreandoNuevo(false);
    setFormulario({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      categoria: producto.categoria,
      disponible: producto.disponible,
      tiene_personalizacion: producto.tiene_personalizacion || false,
      personalizaciones_habilitadas: producto.personalizaciones_habilitadas || []
    });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setCreandoNuevo(false);
    setFormulario({
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: 'otros',
      disponible: true,
      tiene_personalizacion: false,
      personalizaciones_habilitadas: []
    });
  };

  const togglePersonalizacion = (nombreCategoria: string) => {
    setFormulario(prev => {
      const yaHabilitada = prev.personalizaciones_habilitadas.includes(nombreCategoria);
      const nuevasPersonalizaciones = yaHabilitada
        ? prev.personalizaciones_habilitadas.filter(c => c !== nombreCategoria)
        : [...prev.personalizaciones_habilitadas, nombreCategoria];
      
      return {
        ...prev,
        personalizaciones_habilitadas: nuevasPersonalizaciones,
        tiene_personalizacion: nuevasPersonalizaciones.length > 0
      };
    });
  };

  const handleTogglePersonalizacionGeneral = (habilitada: boolean) => {
    setFormulario(prev => ({
      ...prev,
      tiene_personalizacion: habilitada,
      personalizaciones_habilitadas: habilitada ? prev.personalizaciones_habilitadas : []
    }));
  };

  const guardarProducto = async () => {
    if (!formulario.nombre.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }

    if (formulario.precio < 0) {
      setError('El precio debe ser mayor o igual a 0');
      return;
    }

    try {
      setError(null);
      
      if (creandoNuevo) {
        await apiService.createProducto(formulario);
      } else if (editandoId) {
        await apiService.updateProducto(editandoId, formulario);
      }

      await cargarProductos();
      cancelarEdicion();
    } catch (err) {
      setError('Error al guardar el producto');
      console.error('Error:', err);
    }
  };

  const eliminarProducto = async (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar este producto?')) {
      return;
    }

    try {
      await apiService.deleteProducto(id);
      await cargarProductos();
    } catch (err) {
      setError('Error al eliminar el producto');
      console.error('Error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón crear */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-800">Gestión de Productos</h2>
        <button
          onClick={iniciarCreacion}
          className="btn-primary flex items-center"
          disabled={creandoNuevo || editandoId !== null}
        >
          <Plus size={16} className="mr-2" />
          Nuevo Producto
        </button>
      </div>

      {/* Filtro por categoría */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-secondary-700">
            Filtrar por categoría:
          </label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value as string | 'todas')}
            className="input-field w-auto min-w-[200px]"
          >
            <option value="todas">Todas las categorías</option>
            {categoriasDisponibles.map(categoria => (
              <option key={categoria} value={categoria}>
                {categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <span className="text-sm text-secondary-500">
            {productosFiltrados.length} producto(s)
          </span>
        </div>
      </div>

      {/* Formulario de creación/edición */}
      {(creandoNuevo || editandoId !== null) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">
            {creandoNuevo ? 'Crear Nuevo Producto' : 'Editar Producto'}
          </h3>
          
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
                placeholder="Nombre del producto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Precio *
              </label>
              <input
                type="number"
                value={formulario.precio}
                onChange={(e) => setFormulario(prev => ({ ...prev, precio: Number(e.target.value) }))}
                className="input-field"
                placeholder="0"
                min="0"
                step="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Categoría *
              </label>
              <select
                value={formulario.categoria}
                onChange={(e) => setFormulario(prev => ({ ...prev, categoria: e.target.value }))}
                className="input-field"
              >
                {categoriasDisponibles.map(categoria => (
                  <option key={categoria} value={categoria}>
                    {categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Estado
              </label>
              <select
                value={formulario.disponible ? 'true' : 'false'}
                onChange={(e) => setFormulario(prev => ({ ...prev, disponible: e.target.value === 'true' }))}
                className="input-field"
              >
                <option value="true">Disponible</option>
                <option value="false">No Disponible</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Descripción
              </label>
              <textarea
                value={formulario.descripcion}
                onChange={(e) => setFormulario(prev => ({ ...prev, descripcion: e.target.value }))}
                className="input-field"
                rows={3}
                placeholder="Descripción opcional del producto"
              />
            </div>
          </div>

          {/* Sección de Personalizaciones */}
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="tiene_personalizacion"
                checked={formulario.tiene_personalizacion}
                onChange={(e) => handleTogglePersonalizacionGeneral(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded cursor-pointer"
              />
              <label htmlFor="tiene_personalizacion" className="ml-2 block text-sm font-medium text-secondary-700 cursor-pointer">
                Habilitar Personalizaciones para este producto
              </label>
            </div>

            {formulario.tiene_personalizacion && (
              <div className="ml-6 space-y-2">
                <p className="text-sm text-secondary-600 mb-3">
                  Selecciona qué tipos de personalización estarán disponibles para este producto:
                </p>
                {categoriasPersonalizacion.map((categoria) => (
                  <div key={categoria.id} className="flex items-start">
                    <input
                      type="checkbox"
                      id={`cat-${categoria.id}`}
                      checked={formulario.personalizaciones_habilitadas.includes(categoria.nombre)}
                      onChange={() => togglePersonalizacion(categoria.nombre)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded cursor-pointer mt-0.5"
                    />
                    <label htmlFor={`cat-${categoria.id}`} className="ml-2 cursor-pointer">
                      <span className="text-sm font-medium text-secondary-700">
                        {categoria.nombre}
                      </span>
                      {categoria.descripcion && (
                        <span className="text-xs text-secondary-500 block">
                          {categoria.descripcion}
                        </span>
                      )}
                    </label>
                  </div>
                ))}
                {categoriasPersonalizacion.length === 0 && (
                  <p className="text-sm text-secondary-500 italic">
                    No hay categorías de personalización disponibles. 
                    Puedes crearlas en "Gestión de Personalizaciones".
                  </p>
                )}
              </div>
            )}
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
              onClick={guardarProducto}
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

      {/* Lista de productos */}
      <div className="card">
        <h3 className="text-lg font-semibold text-secondary-800 mb-4">
          Productos Actuales ({productos.length})
        </h3>

        {productos.length === 0 ? (
          <p className="text-secondary-600 text-center py-8">
            No hay productos registrados
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {productosFiltrados.map((producto) => (
                  <tr key={producto.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-secondary-900">
                          {producto.nombre}
                        </div>
                        {producto.descripcion && (
                          <div className="text-sm text-secondary-500">
                            {producto.descripcion}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {producto.categoria.charAt(0).toUpperCase() + producto.categoria.slice(1).replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      ${producto.precio.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          producto.disponible
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {producto.disponible ? 'Disponible' : 'No Disponible'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => iniciarEdicion(producto)}
                          disabled={creandoNuevo || editandoId !== null}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => eliminarProducto(producto.id)}
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
