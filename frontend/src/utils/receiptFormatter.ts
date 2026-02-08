import { FormularioComanda, ItemComanda } from '@/types';

// Helper para dividir texto
const dividirTexto = (texto: string, maxLength: number = 48): string[] => {
  if (!texto) return [];
  if (texto.length <= maxLength) return [texto];
  
  const palabras = texto.split(' ');
  const lineas: string[] = [];
  let lineaActual = '';
  
  palabras.forEach(palabra => {
    if ((lineaActual + ' ' + palabra).trim().length <= maxLength) {
      lineaActual = lineaActual ? lineaActual + ' ' + palabra : palabra;
    } else {
      if (lineaActual) lineas.push(lineaActual);
      lineaActual = palabra;
    }
  });
  
  if (lineaActual) lineas.push(lineaActual);
  return lineas;
};

// Helper para formatear personalizaciones usando la función del hook
const formatearPersonalizaciones = (
  personalizacion: any, 
  ordenarPersonalizaciones: (p: any) => Array<[string, any]>,
  obtenerInfoPersonalizacion: (catId: string, itemId: string) => any
): string[] => {
  const lineas: string[] = [];
  
  if (!personalizacion || Object.keys(personalizacion).length === 0) {
    return lineas;
  }

  try {
    const entradasOrdenadas = ordenarPersonalizaciones(personalizacion);
    
    entradasOrdenadas.forEach(([catId, itemId]) => {
      // Ignorar precio_adicional
      if (catId === 'precio_adicional') return;
      
      const info = obtenerInfoPersonalizacion(catId, itemId);
      if (info) {
        lineas.push(`  ${info.item}`);
      }
    });
  } catch (error) {
    console.error('Error al formatear personalizaciones:', error);
  }
  
  return lineas;
};

export const generateComandaReceipt = (
  formulario: FormularioComanda,
  usuarioNombre: string,
  ordenarPersonalizaciones: (p: any) => Array<[string, any]>,
  obtenerInfoPersonalizacion: (catId: string, itemId: string) => any,
  isEditMode: boolean = false,
  onlyNewItems: boolean = false,
  paperWidth: '58mm' | '80mm' = '80mm',
  fontSize: 'small' | 'normal' | 'large' = 'normal'
): string => {
  const lineas: string[] = [];
  
  // Ancho base según tipo de papel: 58mm = 32 caracteres, 80mm = 48 caracteres
  let anchoBase = paperWidth === '58mm' ? 32 : 48;
  
  // Ajustar ancho según tamaño de fuente
  // Fuente 'large' usa doble ancho, por lo que necesitamos la mitad de caracteres
  const ANCHO_LINEA = fontSize === 'large' ? Math.floor(anchoBase / 2) : anchoBase;
  
  const separador = '='.repeat(ANCHO_LINEA);
  const separadorCorto = '-'.repeat(ANCHO_LINEA);
  
  // Comandos ESC/POS para tamaño de fuente
  // \x1D\x21\x00 = Normal, \x1D\x21\x11 = Doble (ancho y alto)
  const fontSizeCmd = fontSize === 'small' ? '\x1D\x21\x00' : 
                      fontSize === 'large' ? '\x1D\x21\x11' : 
                      '\x1D\x21\x00';
  
  // Agregar comando de tamaño de fuente al inicio
  lineas.push(fontSizeCmd);
  
  // Fecha
  const fecha = new Date();
  lineas.push(`Fecha: ${fecha.toLocaleDateString('es-CO')}`);
  lineas.push(`Hora:  ${fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`);
  
  // Mesero/Usuario
  const meseroTexto = `Atendido por: ${usuarioNombre}`;
  if (meseroTexto.length <= ANCHO_LINEA) {
    lineas.push(meseroTexto);
  } else {
    lineas.push('Atendido por:');
    lineas.push(`  ${usuarioNombre}`);
  }
  lineas.push('');
  
  // Info de Mesa o Cliente
  if (formulario.tipo_pedido === 'domicilio' && formulario.datos_cliente) {
    lineas.push('');
    if (formulario.datos_cliente.es_para_llevar) {
      lineas.push('*** PARA LLEVAR ***');
    } else {
      lineas.push('*** DOMICILIO ***');
    }
    lineas.push('');
    lineas.push(`Cliente: ${formulario.datos_cliente.nombre}`);
    
    if (formulario.datos_cliente.telefono) {
      lineas.push(`Tel: ${formulario.datos_cliente.telefono}`);
    }
    
    if (!formulario.datos_cliente.es_para_llevar && formulario.datos_cliente.direccion) {
      lineas.push('Direccion:');
      const direccionLineas = dividirTexto(formulario.datos_cliente.direccion, ANCHO_LINEA - 2);
      direccionLineas.forEach(l => lineas.push(`  ${l}`));
    }
  } else if (formulario.mesas && formulario.mesas.length > 0) {
    const mesasTexto = formulario.mesas.map((m: any) => `${m.numero}`).join(', ');  // ${m.salon}- El salon se omite para ahorrar espacio o por gusto
    if (mesasTexto.length <= 24) {
      lineas.push(`Mesa(s): ${mesasTexto}`);
    } else {
      lineas.push('Mesa(s):');
      const mesasLineas = dividirTexto(mesasTexto, ANCHO_LINEA - 2);
      mesasLineas.forEach(l => lineas.push(`  ${l}`));
    }
  }
  
  lineas.push('');
  lineas.push(separador);
  
  if (isEditMode && onlyNewItems) {
    lineas.push('    *** URGENTE ***');
    lineas.push(' ITEMS ADICIONALES');
  } else if (isEditMode) {
     lineas.push('COMANDA ACTUALIZADA');
  } else {
     lineas.push('     COMANDA DE COCINA');
  }
  
  lineas.push(separador);
  lineas.push('');
  
  // Filtrar items si es solo nuevos
  const itemsToPrint = onlyNewItems 
    ? formulario.items.filter((item: any) => typeof item.id === 'string' && (item.id.startsWith('temp_') || item.id.startsWith('item_')))
    : formulario.items;

  if (itemsToPrint && itemsToPrint.length > 0) {
    itemsToPrint.forEach((item: ItemComanda, index: number) => {
      // Separador entre items
      if (index > 0) {
        lineas.push(separadorCorto);
      }
      
      // Nombre y cantidad
      const nombreProducto = item.producto?.nombre || 'Producto';
      const cantidadTexto = `${item.cantidad}x`;
      const productoCompleto = `${cantidadTexto} ${nombreProducto}`;
      
      if (productoCompleto.length > ANCHO_LINEA) {
        lineas.push(`${cantidadTexto}`);
        lineas.push(`  ${nombreProducto}`);
      } else {
        lineas.push(productoCompleto);
      }
      
      // Personalización
      if (item.personalizacion) {
        const lineasPersonalizacion = formatearPersonalizaciones(
          item.personalizacion,
          ordenarPersonalizaciones,
          obtenerInfoPersonalizacion
        );
        lineasPersonalizacion.forEach(l => lineas.push(l));
      }
      
      // Observaciones item
      if (item.observaciones && item.observaciones.trim() !== '') {
        lineas.push('');
        lineas.push('  OBSERVACIONES:');
        const obsLineas = dividirTexto(item.observaciones, ANCHO_LINEA - 4);
        obsLineas.forEach(l => lineas.push(`    ${l}`));
      }
    });
  } else {
    lineas.push('No hay items nuevos');
  }
  
  lineas.push('');
  lineas.push(separador);
  
  // Observaciones generales
  if (formulario.observaciones_generales && formulario.observaciones_generales.trim() !== '') {
    lineas.push('');
    lineas.push('OBSERVACIONES GENERALES:');
    const obsLineas = dividirTexto(formulario.observaciones_generales, ANCHO_LINEA);
    obsLineas.forEach(l => lineas.push(l));
  }
  
  lineas.push('');
  lineas.push('     ENVIADO A COCINA');
  lineas.push(separador);
  lineas.push(separador);
  
  return lineas.join('\n');
};
