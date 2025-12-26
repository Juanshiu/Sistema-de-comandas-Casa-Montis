import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface CategoriaPersonalizacion {
  id: number;
  nombre: string;
  orden: number;
  activo: boolean;
}

interface ItemPersonalizacion {
  id: number;
  nombre: string;
  precio_adicional: number;
}

export function usePersonalizaciones() {
  const [categorias, setCategorias] = useState<CategoriaPersonalizacion[]>([]);
  const [itemsPorCategoria, setItemsPorCategoria] = useState<{ [key: string]: ItemPersonalizacion[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const categoriasData = await apiService.getCategoriasPersonalizacion();
      const categoriasActivas = categoriasData
        .filter((cat: any) => cat.activo)
        .sort((a: any, b: any) => a.orden - b.orden);
      
      setCategorias(categoriasActivas);
      
      // Cargar items para cada categoría
      const itemsMap: { [key: string]: ItemPersonalizacion[] } = {};
      for (const categoria of categoriasActivas) {
        try {
          const items = await apiService.getItemsPersonalizacion(categoria.id);
          itemsMap[categoria.id] = items;
        } catch (error) {
          console.error(`Error al cargar items de categoría ${categoria.nombre}:`, error);
          itemsMap[categoria.id] = [];
        }
      }
      setItemsPorCategoria(itemsMap);
    } catch (error) {
      console.error('Error al cargar personalizaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Ordena las entradas de personalización según el orden de las categorías
   */
  const ordenarPersonalizaciones = (personalizacion: any): Array<[string, any]> => {
    if (!personalizacion || typeof personalizacion !== 'object') {
      return [];
    }

    return Object.entries(personalizacion)
      .filter(([key]) => key !== 'precio_adicional')
      .sort(([keyA], [keyB]) => {
        const catA = categorias.find(c => c.id === parseInt(keyA));
        const catB = categorias.find(c => c.id === parseInt(keyB));
        return (catA?.orden || 999) - (catB?.orden || 999);
      });
  };

  /**
   * Obtiene información formateada de una personalización
   */
  const obtenerInfoPersonalizacion = (categoriaId: number, itemId: number) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    if (!categoria) return null;

    const itemsDeCategoria = itemsPorCategoria[categoriaId] || [];
    const item = itemsDeCategoria.find(it => it.id === itemId);
    if (!item) return null;

    return {
      categoria: categoria.nombre,
      item: item.nombre,
      precioAdicional: item.precio_adicional
    };
  };

  return {
    categorias,
    itemsPorCategoria,
    loading,
    ordenarPersonalizaciones,
    obtenerInfoPersonalizacion
  };
}
