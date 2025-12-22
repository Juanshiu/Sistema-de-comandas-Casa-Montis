'use client';

import { useState, useEffect } from 'react';
import { PersonalizacionItem, Producto } from '@/types';
import { apiService } from '@/services/api';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PersonalizacionAlmuerzoProps {
  onPersonalizacionChange: (personalizacion: PersonalizacionItem) => void;
  personalizacionInicial?: PersonalizacionItem;
  producto?: Producto;
}

interface CategoriaConItems {
  id: number;
  nombre: string;
  items: any[];
}

export default function PersonalizacionAlmuerzo({ onPersonalizacionChange, personalizacionInicial, producto }: PersonalizacionAlmuerzoProps) {
  const [personalizacion, setPersonalizacion] = useState<PersonalizacionItem>(
    personalizacionInicial || {}
  );
  const [categoriasConItems, setCategoriasConItems] = useState<CategoriaConItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState<{ tipo: 'success' | 'error'; mensaje: string } | null>(null);

  useEffect(() => {
    cargarOpcionesDinamicas();
  }, [producto]);

  useEffect(() => {
    // Listener para notificaciones de cambios de disponibilidad
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'personalizacion_notification') {
        const data = JSON.parse(e.newValue || '{}');
        setNotificacion(data);
        
        // Recargar las opciones para actualizar disponibilidad
        cargarOpcionesDinamicas();
        
        // Ocultar notificación después de 3 segundos
        setTimeout(() => {
          setNotificacion(null);
          localStorage.removeItem('personalizacion_notification');
        }, 3000);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También verificar al montar el componente
    const existingNotification = localStorage.getItem('personalizacion_notification');
    if (existingNotification) {
      const data = JSON.parse(existingNotification);
      setNotificacion(data);
      setTimeout(() => {
        setNotificacion(null);
        localStorage.removeItem('personalizacion_notification');
      }, 3000);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const cargarOpcionesDinamicas = async () => {
    try {
      setLoading(true);
      
      // Cargar todas las categorías activas
      const todasCategorias = await apiService.getCategoriasPersonalizacion();
      
      // Filtrar solo las categorías habilitadas para este producto
      const categoriasHabilitadas = producto?.personalizaciones_habilitadas || [];
      const categoriasParaCargar = todasCategorias.filter((cat: any) => 
        categoriasHabilitadas.includes(cat.nombre)
      );
      
      // Cargar los items de cada categoría habilitada
      const categoriasConItemsPromises = categoriasParaCargar.map(async (cat: any) => {
        const items = await apiService.getItemsPersonalizacion(cat.id);
        // Filtrar solo items disponibles (disponible = 1 o true)
        const itemsDisponibles = items.filter((item: any) => item.disponible === 1 || item.disponible === true);
        return {
          id: cat.id,
          nombre: cat.nombre,
          items: itemsDisponibles || []
        };
      });
      
      const resultado = await Promise.all(categoriasConItemsPromises);
      setCategoriasConItems(resultado);
    } catch (error) {
      console.error('Error al cargar opciones de personalización:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccion = (nombreCategoria: string, opcion: any) => {
    // Convertir el nombre de la categoría a la clave correspondiente
    const clave = nombreCategoria.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '_');
    
    const nuevaPersonalizacion = {
      ...personalizacion,
      [clave]: opcion,
      precio_adicional: calcularPrecioAdicional({
        ...personalizacion,
        [clave]: opcion
      })
    };
    
    setPersonalizacion(nuevaPersonalizacion);
    onPersonalizacionChange(nuevaPersonalizacion);
  };

  const calcularPrecioAdicional = (pers: PersonalizacionItem): number => {
    let total = 0;
    // Sumar todos los precios adicionales de cualquier personalización
    Object.values(pers).forEach((valor: any) => {
      if (valor && typeof valor === 'object' && valor.precio_adicional) {
        total += valor.precio_adicional;
      }
    });
    return total;
  };

  const getSeleccionActual = (nombreCategoria: string): any => {
    const clave = nombreCategoria.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '_');
    return personalizacion[clave];
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-secondary-600 mt-2">Cargando opciones de personalización...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Notificación Toast */}
      {notificacion && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-in ${
          notificacion.tipo === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notificacion.tipo === 'success' ? (
            <CheckCircle2 size={24} className="flex-shrink-0" />
          ) : (
            <XCircle size={24} className="flex-shrink-0" />
          )}
          <p className="font-medium">{notificacion.mensaje}</p>
        </div>
      )}

      <div className="space-y-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">
          🍽️ Personalizar Almuerzo
        </h3>

      {categoriasConItems.length === 0 ? (
        <p className="text-secondary-600 text-center py-4">
          No hay opciones de personalización configuradas para este producto
        </p>
      ) : (
        categoriasConItems.map((categoria) => (
          <div key={categoria.id}>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Seleccionar {categoria.nombre}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {categoria.items.map((item) => {
                const seleccionado = getSeleccionActual(categoria.nombre);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSeleccion(categoria.nombre, item)}
                    className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                      seleccionado?.id === item.id
                        ? 'border-blue-500 bg-blue-100 text-blue-800'
                        : 'border-gray-300 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="font-medium">{item.nombre}</div>
                    {item.precio_adicional > 0 && (
                      <div className="text-sm text-blue-600">
                        +${item.precio_adicional.toLocaleString()}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

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
        💡 <strong>Especialidades:</strong> Filete de tilapia tiene un costo adicional por ser proteína premium
      </div>
      </div>
    </>
  );
}
