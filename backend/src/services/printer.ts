import { db } from '../database/init';
import { Comanda } from '../models';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuración de nuestro plugin HTTP propio (puerto 8001)
const ESC_POS_URL = process.env.ESC_POS_URL || 'http://localhost:8001/imprimir';
const PRINTER_COCINA_NAME = process.env.PRINTER_COCINA_NAME || 'pos58';
const PRINTER_CAJA_NAME = process.env.PRINTER_CAJA_NAME || 'pos58';


  // Impresion de comandas para productos adicionales 
// Función auxiliar para dividir texto largo en líneas de máximo 32 caracteres
const dividirTexto = (texto: string, maxLength: number = 32): string[] => {
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

// Función para crear un archivo de texto con formato de ITEMS ADICIONALES para 58mm
const crearArchivoItemsAdicionales = (comanda: Comanda): string => {
  const lineas: string[] = [];
  
  // Encabezado
  // lineas.push('================================');
  // lineas.push('        CASA MONTIS');
  lineas.push('     COMANDA DE COCINA');
  // lineas.push('================================');
  // lineas.push('');
  
  // Mesa o Cliente según tipo de pedido
  if (comanda.tipo_pedido === 'domicilio' && comanda.datos_cliente) {
    if (comanda.datos_cliente.es_para_llevar) {
      lineas.push(`PARA LLEVAR: ${comanda.datos_cliente.nombre}`);
    } else {
      lineas.push(`DOMICILIO: ${comanda.datos_cliente.nombre}`);
    }
    if (comanda.datos_cliente.telefono) {
      lineas.push(`Tel: ${comanda.datos_cliente.telefono}`);
    }
  } else {
    const mesasTexto = comanda.mesas && comanda.mesas.length > 0 ? 
      comanda.mesas.map(m => `${m.salon}-${m.numero}`).join(', ') : 'N/A';
    lineas.push(`MESA: ${mesasTexto}`);
  }
  lineas.push('');
  
  // Fecha y mesero
  const fecha = comanda.fecha_creacion ? new Date(comanda.fecha_creacion) : new Date();
  lineas.push(`${fecha.toLocaleDateString('es-CO')}`);
  lineas.push(`${fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`);
  lineas.push(`Mesero: ${comanda.mesero}`);
  lineas.push('================================');
  lineas.push('');
  lineas.push('  ** PRODUCTOS ADICIONALES **');
  lineas.push('');
  
  // Items
  if (comanda.items && comanda.items.length > 0) {
    comanda.items.forEach((item, index) => {
      if (index > 0) {
        lineas.push('--------------------------------');
      }
      
      // Nombre del producto con cantidad
      const nombreProducto = item.producto?.nombre || 'Producto';
      lineas.push(`${item.cantidad}x ${nombreProducto}`);
      
      // Personalización
      if (item.personalizacion) {
        let personalizacion;
        try {
          personalizacion = typeof item.personalizacion === 'string' 
            ? JSON.parse(item.personalizacion) 
            : item.personalizacion;
        } catch (e) {
          personalizacion = item.personalizacion;
        }
        
        if (personalizacion) {
          // Recorrer dinámicamente todas las claves de personalización
          Object.keys(personalizacion).forEach((clave) => {
            // Ignorar precio_adicional y claves vacías
            if (clave === 'precio_adicional' || !personalizacion[clave]) return;
            
            const valor = personalizacion[clave];
            // Verificar que sea un objeto con nombre
            if (valor && typeof valor === 'object' && valor.nombre) {
              // Convertir clave a nombre legible (ej: "caldos_sopas" -> "Caldos/Sopas")
              const nombreCategoria = clave
                .split('_')
                .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
                .join(' ')
                .replace('-', '/');
              
              const textoPersonalizacion = `${nombreCategoria}: ${valor.nombre}`;
              const lineasPersonalizacion = dividirTexto(textoPersonalizacion, 30);
              lineasPersonalizacion.forEach(l => lineas.push(`  ${l}`));
            }
          });
        }
      }
      
      // Observaciones
      if (item.observaciones && item.observaciones.trim() !== '') {
        const obsLineas = dividirTexto(item.observaciones, 28);
        lineas.push(`  Obs:`);
        obsLineas.forEach(l => lineas.push(`  ${l}`));
      }
    });
  } else {
    lineas.push('No hay productos');
  }
  
  lineas.push('');
  lineas.push('================================');
  lineas.push('         *** URGENTE ***');
  lineas.push('    SOLO PRODUCTOS NUEVOS');
  lineas.push('================================');
  lineas.push('');
  lineas.push('');
  lineas.push('');
  
  return lineas.join('\n');
};


// COMANDA INICIAL optimizada para 58mm (32 caracteres)
const crearArchivoComanda = (comanda: Comanda): string => {
  const lineas: string[] = [];
  const ANCHO_LINEA = 32;
  const separador = '================================';
  const separadorCorto = '--------------------------------';
  
  // // Encabezado
  // lineas.push(separador);
  // lineas.push('        CASA MONTIS');
  // lineas.push('     COMANDA DE COCINA');
  // lineas.push(separador);
  // lineas.push('');
  
  // Fecha
  const fecha = comanda.fecha_creacion ? new Date(comanda.fecha_creacion) : new Date();
  lineas.push(`Fecha: ${fecha.toLocaleDateString('es-CO')}`);
  lineas.push(`Hora:  ${fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`);
  lineas.push('');
  
  // Mesero
  const meseroTexto = `Mesero: ${comanda.mesero}`;
  if (meseroTexto.length <= ANCHO_LINEA) {
    lineas.push(meseroTexto);
  } else {
    lineas.push('Mesero:');
    lineas.push(`  ${comanda.mesero}`);
  }
  
  // Mesas o Datos de Cliente según tipo de pedido
  if (comanda.tipo_pedido === 'domicilio' && comanda.datos_cliente) {
    lineas.push('');
    if (comanda.datos_cliente.es_para_llevar) {
      lineas.push('*** PARA LLEVAR ***');
    } else {
      lineas.push('*** DOMICILIO ***');
    }
    lineas.push('');
    lineas.push(`Cliente: ${comanda.datos_cliente.nombre}`);
    
    if (comanda.datos_cliente.telefono) {
      lineas.push(`Tel: ${comanda.datos_cliente.telefono}`);
    }
    
    if (!comanda.datos_cliente.es_para_llevar && comanda.datos_cliente.direccion) {
      lineas.push('Direccion:');
      const direccionLineas = dividirTexto(comanda.datos_cliente.direccion, ANCHO_LINEA - 2);
      direccionLineas.forEach(l => lineas.push(`  ${l}`));
    }
  } else if (comanda.mesas && comanda.mesas.length > 0) {
    const mesasTexto = comanda.mesas.map(m => `${m.salon}-${m.numero}`).join(', ');
    if (mesasTexto.length <= 24) {
      lineas.push(`Mesa(s): ${mesasTexto}`);
    } else {
      lineas.push('Mesa(s):');
      const mesasLineas = dividirTexto(mesasTexto, ANCHO_LINEA - 2);
      mesasLineas.forEach(l => lineas.push(`  ${l}`));
    }
  }
  
  lineas.push('');
  // lineas.push(separador);
  // lineas.push('          PRODUCTOS');
  // lineas.push(separador);
  lineas.push('');
  
  // Items
  if (comanda.items && comanda.items.length > 0) {
    comanda.items.forEach((item, index) => {
      if (index > 0) {
        lineas.push(separadorCorto);
      }
      
      // Nombre del producto con cantidad
      const nombreProducto = item.producto?.nombre || 'Producto';
      const cantidadTexto = `${item.cantidad}x`;
      const productoCompleto = `${cantidadTexto} ${nombreProducto}`;
      
      // Si el nombre es muy largo, dividirlo
      if (productoCompleto.length > ANCHO_LINEA) {
        lineas.push(`${cantidadTexto}`);
        lineas.push(`  ${nombreProducto}`);
      } else {
        lineas.push(productoCompleto);
      }
      
      // Personalización
      if (item.personalizacion) {
        let personalizacion;
        try {
          personalizacion = typeof item.personalizacion === 'string' 
            ? JSON.parse(item.personalizacion) 
            : item.personalizacion;
        } catch (e) {
          personalizacion = item.personalizacion;
        }
        
        if (personalizacion) {
          // lineas.push('');
          // lineas.push('  PERSONALIZACION:');
          
          // Recorrer dinámicamente todas las claves de personalización
          Object.keys(personalizacion).forEach((clave) => {
            // Ignorar precio_adicional y claves vacías
            if (clave === 'precio_adicional' || !personalizacion[clave]) return;
            
            const valor = personalizacion[clave];
            // Verificar que sea un objeto con nombre
            if (valor && typeof valor === 'object' && valor.nombre) {
              // Convertir clave a nombre legible (ej: "caldos_sopas" -> "Caldos/Sopas")
              const nombreCategoria = clave
                .split('_')
                .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
                .join(' ')
                .replace('-', '/');
              
              const textoPersonalizacion = `${valor.nombre}`; // ${nombreCategoria}: Si quieres mostrar la categoría
              const lineasPersonalizacion = dividirTexto(textoPersonalizacion, ANCHO_LINEA - 4);
              lineasPersonalizacion.forEach(l => lineas.push(`    ${l}`));
            }
          });
        }
      }
      
      // Observaciones del item
      if (item.observaciones && item.observaciones.trim() !== '') {
        lineas.push('');
        lineas.push('  OBSERVACIONES:');
        const obsLineas = dividirTexto(item.observaciones, ANCHO_LINEA - 4);
        obsLineas.forEach(l => lineas.push(`    ${l}`));
      }
    });
  } else {
    lineas.push('No hay items');
  }
  
  lineas.push('');
  // lineas.push(separador);
  // const totalTexto = `TOTAL: $${comanda.total.toLocaleString('es-CO')}`;
  // lineas.push(totalTexto);
  lineas.push(separador);
  
  // Observaciones generales
  if (comanda.observaciones_generales && comanda.observaciones_generales.trim() !== '') {
    lineas.push('');
    lineas.push('OBSERVACIONES GENERALES:');
    const obsLineas = dividirTexto(comanda.observaciones_generales, ANCHO_LINEA);
    obsLineas.forEach(l => lineas.push(l));
    // lineas.push(separador);
  }
  
  lineas.push('');
  lineas.push('     ENVIADO A COCINA');
  lineas.push(separador);
  lineas.push(separador);
  // lineas.push('');
  // lineas.push('');
  // lineas.push('');
  
  return lineas.join('\n');
};


// Función para obtener datos completos de una comanda
const obtenerComandaCompleta = (comandaId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const comandaQuery = `
      SELECT 
        c.*
      FROM comandas c
      WHERE c.id = ?
    `;
    
    db.get(comandaQuery, [comandaId], (err: any, comandaRow: any) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!comandaRow) {
        reject(new Error('Comanda no encontrada'));
        return;
      }
      
      // Obtener las mesas de la comanda
      const mesasQuery = `
        SELECT m.* 
        FROM mesas m
        INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
        WHERE cm.comanda_id = ?
      `;
      
      db.all(mesasQuery, [comandaId], (err: any, mesasRows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Obtener los items de la comanda
        const itemsQuery = `
          SELECT 
            ci.*,
            p.nombre as producto_nombre,
            p.categoria as producto_categoria
          FROM comanda_items ci
          JOIN productos p ON ci.producto_id = p.id
          WHERE ci.comanda_id = ?
        `;
        
        db.all(itemsQuery, [comandaId], (err: any, itemsRows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Formatear items para que tengan la estructura esperada
          const itemsFormateados = itemsRows.map((item: any) => ({
            ...item,
            producto: {
              nombre: item.producto_nombre,
              categoria: item.producto_categoria
            }
          }));
          
          const comanda = {
            ...comandaRow,
            mesas: mesasRows,
            items: itemsFormateados
          };
          
          resolve(comanda);
        });
      });
    });
  });
};

// Función para formatear la fecha
const formatearFecha = (fecha: Date): string => {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(fecha);
};

// ============================================
// FUNCIÓN PRINCIPAL: IMPRIMIR POR ESC/POS
// ============================================
/**
 * Imprime contenido usando el plugin HTTP a ESC/POS de Parzibyte
 * @param contenido - Texto formateado de la comanda
 * @param nombreImpresora - Nombre de la impresora (ej: "pos58")
 */
async function imprimirPorEscPos(
  contenido: string,
  nombreImpresora: string
): Promise<void> {
  try {
    console.log(`🖨️  Enviando a plugin propio - Impresora: ${nombreImpresora}`);
    console.log(`🌐 URL: ${ESC_POS_URL}`);
    
    // Payload simplificado para nuestro plugin propio
    const payload = {
      texto: contenido,
      impresora: nombreImpresora,
      cortar: true,
      encoding: 'cp850'
    };
    
    console.log('📦 Enviando con encoding CP850 (DOS Latin 1) para tildes');
    
    // Enviar a nuestro plugin HTTP propio
    const response = await fetch(ESC_POS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const resultado = await response.json();
    console.log('✅ Respuesta del plugin:', resultado);
    console.log('✅ Impresión enviada exitosamente');
    
  } catch (error) {
    console.error('❌ Error al imprimir por ESC/POS:', error);
    throw error;
  }
}

// Función principal para imprimir comanda
export const imprimirComanda = async (comanda: Comanda): Promise<void> => {
  let comandaCompleta = comanda;
  
  try {
    console.log('🖨️  ===== FUNCIÓN IMPRIMIR COMANDA LLAMADA =====');
    console.log('🖨️  ID Comanda:', comanda.id);
    console.log('🖨️  Items en comanda:', comanda.items?.length || 0);
    
    // Obtener datos completos de la comanda si no los tiene
    if (!comanda.items || comanda.items.length === 0) {
      console.log('🔄 Obteniendo datos completos de la comanda...');
      comandaCompleta = await obtenerComandaCompleta(comanda.id);
    }
    
    // Crear contenido de la comanda
    let contenidoComanda;
    
    // Si son items adicionales, usar formato especial
    if (comandaCompleta.observaciones_generales && comandaCompleta.observaciones_generales.includes('ITEMS ADICIONALES')) {
      console.log('📄 Generando formato para ITEMS ADICIONALES...');
      contenidoComanda = crearArchivoItemsAdicionales(comandaCompleta);
    } else {
      console.log('📄 Generando formato de comanda completa...');
      contenidoComanda = crearArchivoComanda(comandaCompleta);
    }
    
    // Imprimir usando el plugin HTTP a ESC/POS
    try {
      await imprimirPorEscPos(contenidoComanda, PRINTER_COCINA_NAME);
      console.log('✅ Comanda impresa exitosamente');
    } catch (error) {
      console.error('❌ Error al imprimir por ESC/POS:', error);
      console.log('🔄 Mostrando comanda en consola como fallback...');
      imprimirEnConsola(comandaCompleta);
    }
    
  } catch (error) {
    console.error('❌ Error general al imprimir:', error);
    console.log('🔄 Usando modo de impresión por consola...');
    if (comandaCompleta) {
      imprimirEnConsola(comandaCompleta);
    }
  }
};

// Función para imprimir comanda por ID (compatibilidad con versión anterior)
export const imprimirComandaPorId = async (comandaId: string): Promise<void> => {
  try {
    const comanda = await obtenerComandaCompleta(comandaId);
    await imprimirComanda(comanda);
  } catch (error) {
    console.error('Error al obtener datos de comanda:', error);
    throw error;
  }
};

// Función para imprimir factura
export const imprimirFactura = async (comandaId: string): Promise<void> => {
  try {
    const comanda = await obtenerComandaCompleta(comandaId);
    imprimirFacturaEnConsola(comanda);
  } catch (error) {
    console.error('Error al imprimir factura:', error);
    throw error;
  }
};

// Función para probar la conexión con el plugin ESC/POS
export const probarImpresora = async (): Promise<boolean> => {
  try {
    console.log('🖨️  Probando conexión con plugin HTTP a ESC/POS...');
    console.log(`🌐 URL: ${ESC_POS_URL}`);
    console.log(`🖨️  Impresora: ${PRINTER_COCINA_NAME}`);
    
    const contenidoPrueba = `
=====================================
           CASA MONTIS
         PRUEBA DE IMPRESORA
=====================================
Fecha: ${new Date().toLocaleString('es-CO')}
Impresora: ${PRINTER_COCINA_NAME}
Plugin: HTTP a ESC/POS
=====================================
Si ve este mensaje,
la impresora funciona correctamente.
=====================================
    `;
    
    await imprimirPorEscPos(contenidoPrueba, PRINTER_COCINA_NAME);
    console.log('✅ Prueba de impresión exitosa');
    return true;
    
  } catch (error) {
    console.error('❌ Error al probar impresora:', error);
    console.log('⚠️  Verifica que:');
    console.log('   1. El plugin HTTP a ESC/POS esté corriendo');
    console.log(`   2. La URL ${ESC_POS_URL} sea correcta`);
    console.log(`   3. La impresora "${PRINTER_COCINA_NAME}" esté configurada en el plugin`);
    return false;
  }
};
const imprimirEnConsola = (comanda: any) => {
  console.log('\n' + '='.repeat(50));
  console.log('                 CASA MONTIS');
  console.log('               COMANDA DE COCINA');
  console.log('='.repeat(50));
  
  if (comanda.mesas && comanda.mesas.length > 0) {
    console.log(`Mesa(s): ${comanda.mesas.map((m: any) => `${m.salon} - ${m.numero}`).join(', ')}`);
    console.log(`Capacidad total: ${comanda.mesas.reduce((sum: number, mesa: any) => sum + mesa.capacidad, 0)} personas`);
  }
  
  console.log(`Fecha: ${formatearFecha(new Date(comanda.fecha_creacion))}`);
  console.log(`Mesero: ${comanda.mesero}`);
  console.log(`Comanda: ${comanda.id.substring(0, 8)}`);
  console.log('='.repeat(50));
  console.log('ITEMS:');
  console.log('-'.repeat(50));
  
  if (comanda.items && comanda.items.length > 0) {
    comanda.items.forEach((item: any) => {
      console.log(`${item.cantidad}x ${item.producto_nombre || item.producto?.nombre || 'Producto'}`);
      console.log(`   $${item.precio_unitario.toLocaleString('es-CO')} c/u = $${item.subtotal.toLocaleString('es-CO')}`);
      
      // Personalización
      if (item.personalizacion) {
        let personalizacion;
        try {
          personalizacion = typeof item.personalizacion === 'string' 
            ? JSON.parse(item.personalizacion) 
            : item.personalizacion;
        } catch (e) {
          personalizacion = item.personalizacion;
        }
          
        if (personalizacion) {
          console.log('     PERSONALIZACION:');
          
          // Recorrer dinámicamente todas las claves de personalización
          Object.keys(personalizacion).forEach((clave) => {
            // Ignorar precio_adicional y claves vacías
            if (clave === 'precio_adicional' || !personalizacion[clave]) return;
            
            const valor = personalizacion[clave];
            // Verificar que sea un objeto con nombre
            if (valor && typeof valor === 'object' && valor.nombre) {
              // Convertir clave a nombre legible
              const nombreCategoria = clave
                .split('_')
                .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
                .join(' ')
                .replace('-', '/');
              
              console.log(`       🔹 ${nombreCategoria}: ${valor.nombre}`);
            }
          });
        }
      }
      
      if (item.observaciones) {
        console.log(`   📝 Obs: ${item.observaciones}`);
      }
      console.log('');
    });
  }
  
  console.log('-'.repeat(50));
  console.log(`💰 Total: $${comanda.total.toLocaleString('es-CO')}`);
  
  if (comanda.observaciones_generales) {
    console.log('='.repeat(50));
    console.log('📋 OBSERVACIONES GENERALES:');
    console.log(comanda.observaciones_generales);
  }
  
  console.log('='.repeat(50));
  console.log('✅ Comanda enviada a cocina');
  console.log('='.repeat(50) + '\n');
};

const imprimirFacturaEnConsola = (comanda: any) => {
  console.log('\n' + '='.repeat(50));
  console.log('                 CASA MONTIS');
  console.log('                   FACTURA');
  console.log('='.repeat(50));
  console.log(`Mesa: ${comanda.mesa_numero}`);
  console.log(`Fecha: ${formatearFecha(new Date(comanda.fecha_creacion))}`);
  console.log(`Atendido por: ${comanda.mesero}`);
  console.log(`Factura: ${comanda.id.substring(0, 8)}`);
  console.log('='.repeat(50));
  console.log('DESCRIPCION                    CANT    VALOR');
  console.log('-'.repeat(50));
  
  comanda.items.forEach((item: any) => {
    const nombre = item.producto_nombre.substring(0, 30).padEnd(30);
    const cantidad = item.cantidad.toString().padStart(4);
    const valor = `$${item.subtotal.toLocaleString('es-CO')}`.padStart(10);
    
    console.log(`${nombre} ${cantidad} ${valor}`);
  });
  
  console.log('-'.repeat(50));
  console.log(`SUBTOTAL:                           $${comanda.subtotal.toLocaleString('es-CO')}`);
  console.log(`TOTAL:                              $${comanda.total.toLocaleString('es-CO')}`);
  console.log('='.repeat(50));
  console.log('               ¡GRACIAS POR SU VISITA!');
  console.log('                  Vuelva pronto');
  console.log('='.repeat(50) + '\n');
};
