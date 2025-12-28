'use client';

import { useState, useEffect, useRef } from 'react';
import { Producto, ItemComanda } from '@/types';
import { apiService } from '@/services/api';
import { Search, Plus, X } from 'lucide-react';

interface BuscadorProductosProps {
  onAgregarProducto: (item: ItemComanda) => void;
  productosEnCarrito?: number;
}

export default function BuscadorProductos({ onAgregarProducto, productosEnCarrito = 0 }: BuscadorProductosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultadosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    // Cerrar resultados al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultadosRef.current &&
        !resultadosRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setMostrarResultados(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (busqueda.trim().length >= 2) {
      filtrarProductos(busqueda);
      setMostrarResultados(true);
    } else {
      setProductosFiltrados([]);
      setMostrarResultados(false);
    }
  }, [busqueda, productos]);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProductos();
      setProductos(response);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtrarProductos = (termino: string) => {
    const terminoLower = termino.toLowerCase().trim();
    const filtrados = productos.filter((producto) => {
      const nombreMatch = producto.nombre.toLowerCase().includes(terminoLower);
      const categoriaMatch = producto.categoria.toLowerCase().includes(terminoLower);
      return nombreMatch || categoriaMatch;
    });
    setProductosFiltrados(filtrados.slice(0, 10)); // Máximo 10 resultados
  };

  const handleSeleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setBusqueda('');
    setMostrarResultados(false);
    setCantidad(1);
  };

  const handleAgregarAlCarrito = () => {
    if (!productoSeleccionado) return;

    // Verificar si el producto tiene personalizaciones habilitadas
    const tienePersonalizacion = productoSeleccionado.tiene_personalizacion;

    const nuevoItem: ItemComanda = {
      id: `item_${Date.now()}_${Math.random()}_${productoSeleccionado.id}`,
      producto: productoSeleccionado,
      cantidad: cantidad,
      precio_unitario: productoSeleccionado.precio,
      subtotal: productoSeleccionado.precio * cantidad,
      // Si tiene personalización, marcar como pendiente para que se configure después
      ...(tienePersonalizacion && { personalizacion_pendiente: true })
    };

    onAgregarProducto(nuevoItem);
    setProductoSeleccionado(null);
    setCantidad(1);
    
    // Enfocar de nuevo el input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCancelarSeleccion = () => {
    setProductoSeleccionado(null);
    setCantidad(1);
    setBusqueda('');
  };

  return (
    <div className="card mb-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary-800 mb-2 flex items-center">
            <Search className="mr-2 text-primary-600" size={20} />
            Búsqueda Rápida de Productos
          </h3>
          {productosEnCarrito > 0 && (
            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              {productosEnCarrito} {productosEnCarrito === 1 ? 'producto agregado' : 'productos agregados'}
            </div>
          )}
        </div>
        <p className="text-sm text-secondary-600">
          Busca productos por nombre o categoría. Escribe al menos 2 caracteres.
        </p>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto... (ej: 'Almuerzo', 'Pechuga', 'Gaseosa')"
            className="w-full px-4 py-3 pr-10 border-2 border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={!!productoSeleccionado}
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-400" size={20} />
        </div>

        {/* Resultados de búsqueda */}
        {mostrarResultados && productosFiltrados.length > 0 && (
          <div
            ref={resultadosRef}
            className="absolute z-50 w-full mt-2 bg-white border-2 border-secondary-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          >
            {productosFiltrados.map((producto) => (
              <button
                key={producto.id}
                onClick={() => handleSeleccionarProducto(producto)}
                className="w-full px-4 py-3 text-left hover:bg-primary-50 border-b border-secondary-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-secondary-900 flex items-center">
                      {producto.nombre}
                      {producto.tiene_personalizacion ? (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                          ⚙️
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm text-secondary-600 mt-0.5">
                      {producto.categoria.charAt(0).toUpperCase() + producto.categoria.slice(1).replace(/_/g, ' ')}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-semibold text-primary-600">
                      ${producto.precio.toLocaleString()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mensaje cuando no hay resultados */}
        {mostrarResultados && busqueda.length >= 2 && productosFiltrados.length === 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white border-2 border-secondary-200 rounded-lg shadow-lg p-4">
            <p className="text-secondary-600 text-center">
              No se encontraron productos con "{busqueda}"
            </p>
          </div>
        )}
      </div>

      {/* Producto seleccionado - Agregar cantidad */}
      {productoSeleccionado && (
        <div className="mt-4 p-4 bg-primary-50 rounded-lg border-2 border-primary-300">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="font-semibold text-secondary-900 text-lg">
                {productoSeleccionado.nombre}
              </h4>
              <p className="text-sm text-secondary-600 mt-1">
                {productoSeleccionado.categoria.charAt(0).toUpperCase() + 
                 productoSeleccionado.categoria.slice(1).replace(/_/g, ' ')}
              </p>
              <p className="text-lg font-bold text-primary-600 mt-2">
                ${productoSeleccionado.precio.toLocaleString()} c/u
              </p>
              {productoSeleccionado.tiene_personalizacion ? (
                <div className="mt-2 px-2 py-1 bg-amber-100 border border-amber-300 rounded text-xs text-amber-800 inline-flex items-center">
                  ⚙️ Requiere personalización (se configurará en el siguiente paso)
                </div>
              ) : null}
            </div>
            <button
              onClick={handleCancelarSeleccion}
              className="text-secondary-500 hover:text-secondary-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Cantidad
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  className="w-10 h-10 flex items-center justify-center bg-white border-2 border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={cantidad}
                  onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center px-3 py-2 border-2 border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
                <button
                  onClick={() => setCantidad(cantidad + 1)}
                  className="w-10 h-10 flex items-center justify-center bg-white border-2 border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Subtotal
              </label>
              <div className="text-2xl font-bold text-primary-600">
                ${(productoSeleccionado.precio * cantidad).toLocaleString()}
              </div>
            </div>

            <div className="flex-1 pt-6">
              <button
                onClick={handleAgregarAlCarrito}
                className="w-full btn-primary flex items-center justify-center"
              >
                <Plus size={18} className="mr-2" />
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de carga */}
      {loading && (
        <div className="mt-4 text-center text-secondary-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2">Cargando productos...</p>
        </div>
      )}
    </div>
  );
}
