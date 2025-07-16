'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface Categoria {
  nombre: string;
  cantidadProductos: number;
}

export default function GestionCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [editandoCategoria, setEditandoCategoria] = useState<string | null>(null);
  const [nombreEditar, setNombreEditar] = useState('');

  useEffect(() => {
    cargarCategorias();
  }, []);

  const cargarCategorias = async () => {
    try {
      setLoading(true);
      const [categoriasResponse, productosResponse] = await Promise.all([
        apiService.getCategorias(),
        apiService.getAllProductos()
      ]);

      // Contar productos por categoría
      const categoriasConConteo = categoriasResponse.map(categoria => {
        const cantidadProductos = productosResponse.filter(
          producto => producto.categoria === categoria
        ).length;
        return {
          nombre: categoria,
          cantidadProductos
        };
      });

      setCategorias(categoriasConConteo);
      setError(null);
    } catch (err) {
      setError('Error al cargar las categorías');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const agregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;

    try {
      // Crear un producto temporal con la nueva categoría para que se registre
      const productoTemp = {
        nombre: `Producto temporal - ${nuevaCategoria}`,
        descripcion: 'Producto temporal para crear categoría - eliminar después',
        precio: 0,
        categoria: nuevaCategoria.toLowerCase().replace(/\s+/g, '_'),
        disponible: false
      };

      await apiService.createProducto(productoTemp);
      await cargarCategorias();
      setNuevaCategoria('');
    } catch (err) {
      setError('Error al agregar la categoría');
      console.error('Error:', err);
    }
  };

  const iniciarEdicion = (categoria: string) => {
    setEditandoCategoria(categoria);
    setNombreEditar(categoria);
  };

  const cancelarEdicion = () => {
    setEditandoCategoria(null);
    setNombreEditar('');
  };

  const guardarEdicion = async () => {
    if (!nombreEditar.trim() || !editandoCategoria) return;

    try {
      // Actualizar todos los productos que tengan la categoría anterior
      const productos = await apiService.getAllProductos();
      const productosAActualizar = productos.filter(
        producto => producto.categoria === editandoCategoria
      );

      const nuevaCategoriaNormalizada = nombreEditar.toLowerCase().replace(/\s+/g, '_');

      // Actualizar cada producto
      await Promise.all(
        productosAActualizar.map(producto =>
          apiService.updateProducto(producto.id, {
            ...producto,
            categoria: nuevaCategoriaNormalizada
          })
        )
      );

      await cargarCategorias();
      setEditandoCategoria(null);
      setNombreEditar('');
    } catch (err) {
      setError('Error al actualizar la categoría');
      console.error('Error:', err);
    }
  };

  const eliminarCategoria = async (categoria: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la categoría "${categoria}"? Todos los productos de esta categoría se moverán a "otros".`)) {
      return;
    }

    try {
      // Mover todos los productos de esta categoría a "otros"
      const productos = await apiService.getAllProductos();
      const productosAActualizar = productos.filter(
        producto => producto.categoria === categoria
      );

      await Promise.all(
        productosAActualizar.map(producto =>
          apiService.updateProducto(producto.id, {
            ...producto,
            categoria: 'otros'
          })
        )
      );

      await cargarCategorias();
    } catch (err) {
      setError('Error al eliminar la categoría');
      console.error('Error:', err);
    }
  };

  const formatearNombreCategoria = (categoria: string) => {
    return categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-secondary-600">Cargando categorías...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-secondary-900">Gestión de Categorías</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Formulario para agregar nueva categoría */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Agregar Nueva Categoría</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            placeholder="Nombre de la categoría"
            className="input-field flex-1"
            onKeyPress={(e) => e.key === 'Enter' && agregarCategoria()}
          />
          <button
            onClick={agregarCategoria}
            disabled={!nuevaCategoria.trim()}
            className="btn-primary"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Lista de categorías */}
      <div className="bg-white rounded-lg shadow-sm border border-secondary-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-semibold text-secondary-900">
            Categorías Existentes ({categorias.length})
          </h3>
        </div>

        {categorias.length === 0 ? (
          <div className="p-8 text-center text-secondary-500">
            No hay categorías registradas
          </div>
        ) : (
          <div className="divide-y divide-secondary-200">
            {categorias.map((categoria) => (
              <div key={categoria.nombre} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {editandoCategoria === categoria.nombre ? (
                    <input
                      type="text"
                      value={nombreEditar}
                      onChange={(e) => setNombreEditar(e.target.value)}
                      className="input-field w-64"
                      onKeyPress={(e) => e.key === 'Enter' && guardarEdicion()}
                      autoFocus
                    />
                  ) : (
                    <div>
                      <span className="text-sm font-medium text-secondary-900">
                        {formatearNombreCategoria(categoria.nombre)}
                      </span>
                      <div className="text-xs text-secondary-500">
                        {categoria.cantidadProductos} producto(s)
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {editandoCategoria === categoria.nombre ? (
                    <>
                      <button
                        onClick={guardarEdicion}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={cancelarEdicion}
                        className="text-secondary-600 hover:text-secondary-700 text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => iniciarEdicion(categoria.nombre)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Editar
                      </button>
                      {categoria.cantidadProductos === 0 && (
                        <button
                          onClick={() => eliminarCategoria(categoria.nombre)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
        <h4 className="font-medium mb-1">Información sobre categorías:</h4>
        <ul className="text-sm space-y-1">
          <li>• Las categorías se crean automáticamente cuando se asignan a productos</li>
          <li>• Solo se pueden eliminar categorías que no tengan productos asignados</li>
          <li>• Al editar una categoría, se actualizan todos los productos asociados</li>
          <li>• Al eliminar una categoría, los productos se mueven a "otros"</li>
        </ul>
      </div>
    </div>
  );
}
