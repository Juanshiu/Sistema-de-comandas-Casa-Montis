'use client';

import { useState, useEffect } from 'react';
import { TipoServicio, Producto, ItemComanda, PersonalizacionItem } from '@/types';
import { apiService } from '@/services/api';
import { Plus, Minus, Trash2, Settings } from 'lucide-react';
import PersonalizacionDesayuno from './PersonalizacionDesayuno';
import PersonalizacionAlmuerzo from './PersonalizacionAlmuerzo';

interface SeleccionProductosProps {
  tipoServicio: TipoServicio;
  items: ItemComanda[];
  onItemsChange: (items: ItemComanda[]) => void;
}

export default function SeleccionProductos({ tipoServicio, items, onItemsChange }: SeleccionProductosProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemPersonalizando, setItemPersonalizando] = useState<string | null>(null);

  useEffect(() => {
    cargarProductos();
  }, [tipoServicio]);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const productosData = await apiService.getProductosByCategoria(tipoServicio as any);
      setProductos(productosData);
      setError(null);
    } catch (err) {
      setError('Error al cargar los productos');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const agregarProducto = (producto: Producto) => {
    // Para almuerzo y desayuno, siempre crear items separados para permitir personalizaciones únicas
    if (producto.categoria === 'almuerzo' || producto.categoria === 'desayuno') {
      const nuevoItem: ItemComanda = {
        id: `item_${Date.now()}_${Math.random()}_${producto.id}`,
        producto,
        cantidad: 1,
        precio_unitario: producto.precio,
        subtotal: producto.precio,
        observaciones: ''
      };
      onItemsChange([...items, nuevoItem]);
      return;
    }

    // Para otros productos, mantener la lógica original de sumar cantidades
    const itemExistente = items.find(item => item.producto.id === producto.id);
    
    if (itemExistente) {
      const nuevosItems = items.map(item =>
        item.producto.id === producto.id
          ? {
              ...item,
              cantidad: item.cantidad + 1,
              subtotal: calcularSubtotalConPersonalizacion(item.cantidad + 1, item.precio_unitario, item.personalizacion)
            }
          : item
      );
      onItemsChange(nuevosItems);
    } else {
      const nuevoItem: ItemComanda = {
        id: `item_${Date.now()}_${producto.id}`,
        producto,
        cantidad: 1,
        precio_unitario: producto.precio,
        subtotal: producto.precio,
        observaciones: ''
      };
      onItemsChange([...items, nuevoItem]);
    }
  };

  const calcularSubtotalConPersonalizacion = (cantidad: number, precioUnitario: number, personalizacion?: PersonalizacionItem): number => {
    const precioBase = cantidad * precioUnitario;
    const precioAdicional = personalizacion?.precio_adicional || 0;
    return precioBase + (cantidad * precioAdicional);
  };

  const quitarProducto = (productoId: number) => {
    const producto = productos.find(p => p.id === productoId);
    
    // Para almuerzo y desayuno, eliminar el último item agregado de ese producto
    if (producto && (producto.categoria === 'almuerzo' || producto.categoria === 'desayuno')) {
      const itemsDeEsteProducto = items.filter(item => item.producto.id === productoId);
      if (itemsDeEsteProducto.length > 0) {
        // Eliminar el último item agregado
        const ultimoItem = itemsDeEsteProducto[itemsDeEsteProducto.length - 1];
        const nuevosItems = items.filter(item => item.id !== ultimoItem.id);
        onItemsChange(nuevosItems);
      }
      return;
    }

    // Para otros productos, mantener la lógica original
    const itemExistente = items.find(item => item.producto.id === productoId);
    
    if (itemExistente && itemExistente.cantidad > 1) {
      const nuevosItems = items.map(item =>
        item.producto.id === productoId
          ? {
              ...item,
              cantidad: item.cantidad - 1,
              subtotal: calcularSubtotalConPersonalizacion(item.cantidad - 1, item.precio_unitario, item.personalizacion)
            }
          : item
      );
      onItemsChange(nuevosItems);
    } else {
      eliminarItem(productoId);
    }
  };

  const eliminarItem = (productoId: number) => {
    const producto = productos.find(p => p.id === productoId);
    
    // Para almuerzo y desayuno, eliminar todos los items de ese producto
    if (producto && (producto.categoria === 'almuerzo' || producto.categoria === 'desayuno')) {
      const nuevosItems = items.filter(item => item.producto.id !== productoId);
      onItemsChange(nuevosItems);
      return;
    }

    // Para otros productos, mantener la lógica original
    const nuevosItems = items.filter(item => item.producto.id !== productoId);
    onItemsChange(nuevosItems);
  };

  const personalizarItem = (itemId: string) => {
    setItemPersonalizando(itemId);
  };

  const guardarPersonalizacion = (itemId: string, personalizacion: PersonalizacionItem) => {
    const nuevosItems = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          personalizacion,
          subtotal: calcularSubtotalConPersonalizacion(item.cantidad, item.precio_unitario, personalizacion)
        };
      }
      return item;
    });
    onItemsChange(nuevosItems);
    setItemPersonalizando(null);
  };

  const esPersonalizable = (categoria: string): boolean => {
    return categoria === 'desayuno' || categoria === 'almuerzo';
  };

  const actualizarObservaciones = (itemId: string, observaciones: string) => {
    const nuevosItems = items.map(item =>
      item.id === itemId
        ? { ...item, observaciones }
        : item
    );
    onItemsChange(nuevosItems);
  };

  const obtenerCantidadProducto = (productoId: number): number => {
    // Para almuerzo y desayuno, contar todos los items con ese producto (no sumar cantidades)
    const producto = productos.find(p => p.id === productoId);
    if (producto && (producto.categoria === 'almuerzo' || producto.categoria === 'desayuno')) {
      return items.filter(item => item.producto.id === productoId).length;
    }
    
    // Para otros productos, sumar las cantidades
    const item = items.find(item => item.producto.id === productoId);
    return item ? item.cantidad : 0;
  };

  const calcularTotal = (): number => {
    return items.reduce((total, item) => total + item.subtotal, 0);
  };

  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Productos</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Seleccionar Productos</h2>
        <div className="text-red-600 text-center py-4">
          {error}
          <button 
            onClick={cargarProductos}
            className="block mx-auto mt-2 btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de productos */}
      <div className="card">
        <h2 className="text-xl font-semibold text-secondary-800 mb-4">Productos Disponibles</h2>
        
        {productos.length === 0 ? (
          <p className="text-secondary-600 text-center py-4">
            No hay productos disponibles para esta categoría
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((producto) => {
              const cantidad = obtenerCantidadProducto(producto.id);
              
              return (
                <div key={producto.id} className="border border-secondary-200 rounded-lg p-4 bg-white">
                  <div className="mb-3">
                    <h3 className="font-semibold text-secondary-800 mb-1">
                      {producto.nombre}
                    </h3>
                    {producto.descripcion && (
                      <p className="text-sm text-secondary-600 mb-2">
                        {producto.descripcion}
                      </p>
                    )}
                    <p className="text-lg font-bold text-primary-600">
                      ${producto.precio.toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => quitarProducto(producto.id)}
                        disabled={cantidad === 0}
                        className="w-8 h-8 rounded-full bg-secondary-200 hover:bg-secondary-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <Minus size={16} />
                      </button>
                      
                      <span className="w-8 text-center font-semibold">
                        {cantidad}
                      </span>
                      
                      <button
                        onClick={() => agregarProducto(producto)}
                        disabled={!producto.disponible}
                        className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    {cantidad > 0 && (
                      <button
                        onClick={() => eliminarItem(producto.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumen de items seleccionados */}
      {items.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-secondary-800 mb-4">
            Items Seleccionados ({items.length})
          </h3>
          
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="p-3 bg-secondary-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-medium text-secondary-800">
                      {item.producto.nombre} x {item.cantidad}
                    </div>
                    <div className="text-sm text-secondary-600">
                      ${item.precio_unitario.toLocaleString()} c/u
                      {item.personalizacion?.precio_adicional && item.personalizacion.precio_adicional > 0 && (
                        <span className="text-primary-600">
                          {' '}+ ${item.personalizacion.precio_adicional.toLocaleString()} personalización
                        </span>
                      )}
                      {' '}= ${item.subtotal.toLocaleString()}
                    </div>
                    
                    {item.personalizacion && (
                      <div className="text-xs text-secondary-500 mt-1">
                        {item.personalizacion.caldo && `Caldo: ${item.personalizacion.caldo.nombre}`}
                        {item.personalizacion.principio && ` | Principio: ${item.personalizacion.principio.nombre}`}
                        {item.personalizacion.proteina && ` | Proteína: ${item.personalizacion.proteina.nombre}`}
                        {item.personalizacion.bebida && ` | Bebida: ${item.personalizacion.bebida.nombre}`}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex items-center space-x-2">
                    {esPersonalizable(item.producto.categoria) && (
                      <button
                        onClick={() => personalizarItem(item.id)}
                        className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
                        title="Personalizar"
                      >
                        <Settings size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => quitarProducto(item.producto.id)}
                      className="w-8 h-8 rounded-full bg-secondary-200 hover:bg-secondary-300 flex items-center justify-center"
                    >
                      <Minus size={16} />
                    </button>
                    
                    <span className="w-8 text-center font-semibold">
                      {item.cantidad}
                    </span>
                    
                    <button
                      onClick={() => agregarProducto(item.producto)}
                      className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </button>
                    
                    <button
                      onClick={() => eliminarItem(item.producto.id)}
                      className="text-red-500 hover:text-red-700 p-1 ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Observaciones para este item..."
                    value={item.observaciones || ''}
                    onChange={(e) => actualizarObservaciones(item.id, e.target.value)}
                    className="w-full text-sm input-field"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-secondary-800">Total:</span>
              <span className="text-xl font-bold text-primary-600">
                ${calcularTotal().toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de personalización */}
      {itemPersonalizando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-secondary-800">
                Personalizar Producto
              </h3>
              <button
                onClick={() => setItemPersonalizando(null)}
                className="text-secondary-400 hover:text-secondary-600"
              >
                ✕
              </button>
            </div>
            
            {(() => {
              const item = items.find(i => i.id === itemPersonalizando);
              if (!item) return null;
              
              if (item.producto.categoria === 'desayuno') {
                return (
                  <PersonalizacionDesayuno
                    onPersonalizacionChange={(personalizacion) => 
                      guardarPersonalizacion(itemPersonalizando, personalizacion)
                    }
                    personalizacionInicial={item.personalizacion}
                  />
                );
              } else if (item.producto.categoria === 'almuerzo') {
                return (
                  <PersonalizacionAlmuerzo
                    onPersonalizacionChange={(personalizacion) => 
                      guardarPersonalizacion(itemPersonalizando, personalizacion)
                    }
                    personalizacionInicial={item.personalizacion}
                  />
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
