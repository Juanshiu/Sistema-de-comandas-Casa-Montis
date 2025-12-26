import { usePersonalizaciones } from './hooks/usePersonalizaciones';

interface PersonalizacionDisplayProps {
  personalizacion: any;
  mostrarPrecios?: boolean;
  className?: string;
  formato?: 'lista' | 'texto' | 'inline'; // lista: con bullets, texto: array de strings, inline: separado por |
}

/**
 * Componente reutilizable para mostrar personalizaciones ordenadas
 */
export default function PersonalizacionDisplay({ 
  personalizacion, 
  mostrarPrecios = false,
  className = '',
  formato = 'lista'
}: PersonalizacionDisplayProps) {
  const { ordenarPersonalizaciones, obtenerInfoPersonalizacion, loading } = usePersonalizaciones();

  if (loading || !personalizacion || Object.keys(personalizacion).length === 0) {
    return null;
  }

  const entradasOrdenadas = ordenarPersonalizaciones(personalizacion);
  if (entradasOrdenadas.length === 0) {
    return null;
  }

  // Formato lista (con bullets)
  if (formato === 'lista') {
    return (
      <div className={className || 'text-xs space-y-1'}>
        {entradasOrdenadas.map(([key, value]) => {
          const info = obtenerInfoPersonalizacion(parseInt(key), value as number);
          if (!info) return null;

          return (
            <div key={key} className="flex items-center gap-1">
              <span className="font-medium">{info.categoria}:</span>
              <span>{info.item}</span>
              {mostrarPrecios && info.precioAdicional > 0 && (
                <span className="text-primary-600 ml-1">
                  (+${info.precioAdicional.toLocaleString()})
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Formato texto (retorna array de strings para usos como impresión)
  if (formato === 'texto') {
    const textos = entradasOrdenadas
      .map(([key, value]) => {
        const info = obtenerInfoPersonalizacion(parseInt(key), value as number);
        if (!info) return null;
        return info.item.trim();
      })
      .filter(Boolean);

    return <>{textos.join(' | ')}</>;
  }

  // Formato inline (separado por |, usado en InterfazCaja)
  if (formato === 'inline') {
    const items = entradasOrdenadas
      .map(([key, value]) => {
        const info = obtenerInfoPersonalizacion(parseInt(key), value as number);
        if (!info) return null;
        return info.item.trim();
      })
      .filter(Boolean);

    return <>{items.join(' | ')}</>;
  }

  return null;
}

/**
 * Hook para obtener personalizaciones como array de texto
 */
export function usePersonalizacionesTexto(personalizacion: any): string[] {
  const { ordenarPersonalizaciones, obtenerInfoPersonalizacion, loading } = usePersonalizaciones();

  if (loading || !personalizacion || Object.keys(personalizacion).length === 0) {
    return [];
  }

  const entradasOrdenadas = ordenarPersonalizaciones(personalizacion);
  
  return entradasOrdenadas
    .map(([key, value]) => {
      const info = obtenerInfoPersonalizacion(parseInt(key), value as number);
      if (!info) return null;
      return `${info.categoria}: ${info.item}`;
    })
    .filter(Boolean) as string[];
}

/**
 * Utilidad para obtener array de nombres de items (para impresión)
 */
export function getPersonalizacionesParaImpresion(
  personalizacion: any,
  categorias: any[],
  itemsPorCategoria: { [key: string]: any[] }
): string[] {
  if (!personalizacion || Object.keys(personalizacion).length === 0) {
    return [];
  }

  const entradasOrdenadas = Object.entries(personalizacion)
    .filter(([key]) => key !== 'precio_adicional')
    .sort(([keyA], [keyB]) => {
      const catA = categorias.find(c => c.id === parseInt(keyA));
      const catB = categorias.find(c => c.id === parseInt(keyB));
      return (catA?.orden || 999) - (catB?.orden || 999);
    });

  return entradasOrdenadas
    .map(([key, value]) => {
      const categoriaId = parseInt(key);
      const itemId = value as number;
      
      const itemsDeCategoria = itemsPorCategoria[categoriaId] || [];
      const itemSeleccionado = itemsDeCategoria.find((it: any) => it.id === itemId);
      
      return itemSeleccionado ? itemSeleccionado.nombre.trim() : null;
    })
    .filter(Boolean) as string[];
}
