import { db } from '../database/init';
import { Comanda } from '../models';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

// Obtener nombre de impresora desde variables de entorno
const PRINTER_COCINA_NAME = process.env.PRINTER_COCINA_NAME || 'POS-58';
const PRINTER_CAJA_NAME = process.env.PRINTER_CAJA_NAME || 'POS-80';



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
  lineas.push('================================');
  lineas.push('        CASA MONTIS');
  lineas.push('     COMANDA DE COCINA');
  lineas.push('================================');
  lineas.push('');
  
  // Mesa
  const mesasTexto = comanda.mesas && comanda.mesas.length > 0 ? 
    comanda.mesas.map(m => `${m.salon}-${m.numero}`).join(', ') : 'N/A';
  lineas.push(`MESA: ${mesasTexto}`);
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
          if (personalizacion.caldo) {
            lineas.push(`  Caldo: ${personalizacion.caldo.nombre}`);
          }
          if (personalizacion.principio) {
            const principioLineas = dividirTexto(`Principio: ${personalizacion.principio.nombre}`, 30);
            principioLineas.forEach(l => lineas.push(`  ${l}`));
          }
          if (personalizacion.proteina) {
            lineas.push(`  Proteina: ${personalizacion.proteina.nombre}`);
          }
          if (personalizacion.bebida) {
            lineas.push(`  Bebida: ${personalizacion.bebida.nombre}`);
          }
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
  
  // Encabezado
  lineas.push(separador);
  lineas.push('        CASA MONTIS');
  lineas.push('     COMANDA DE COCINA');
  lineas.push(separador);
  lineas.push('');
  
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
  
  // Mesas
  if (comanda.mesas && comanda.mesas.length > 0) {
    const mesasTexto = comanda.mesas.map(m => `${m.salon}-${m.numero}`).join(', ');
    if (mesasTexto.length <= 24) {
      lineas.push(`Mesa(s): ${mesasTexto}`);
    } else {
      lineas.push('Mesa(s):');
      const mesasLineas = dividirTexto(mesasTexto, ANCHO_LINEA - 2);
      mesasLineas.forEach(l => lineas.push(`  ${l}`));
    }
    
    const capacidadTotal = comanda.mesas.reduce((sum, mesa) => sum + mesa.capacidad, 0);
    lineas.push(`Capacidad: ${capacidadTotal} pers.`);
  }
  
  lineas.push('');
  lineas.push(separador);
  lineas.push('          PRODUCTOS');
  lineas.push(separador);
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
          lineas.push('');
          lineas.push('  PERSONALIZACION:');
          
          if (personalizacion.caldo) {
            const caldoLineas = dividirTexto(`Caldo: ${personalizacion.caldo.nombre}`, ANCHO_LINEA - 4);
            caldoLineas.forEach(l => lineas.push(`    ${l}`));
          }
          
          if (personalizacion.principio) {
            const principioLineas = dividirTexto(`Principio: ${personalizacion.principio.nombre}`, ANCHO_LINEA - 4);
            principioLineas.forEach(l => lineas.push(`    ${l}`));
          }
          
          if (personalizacion.proteina) {
            const proteinaLineas = dividirTexto(`Proteina: ${personalizacion.proteina.nombre}`, ANCHO_LINEA - 4);
            proteinaLineas.forEach(l => lineas.push(`    ${l}`));
          }
          
          if (personalizacion.bebida) {
            const bebidaLineas = dividirTexto(`Bebida: ${personalizacion.bebida.nombre}`, ANCHO_LINEA - 4);
            bebidaLineas.forEach(l => lineas.push(`    ${l}`));
          }
          
          if (personalizacion.acompanamiento) {
            const acompLineas = dividirTexto(`Acomp: ${personalizacion.acompanamiento.nombre}`, ANCHO_LINEA - 4);
            acompLineas.forEach(l => lineas.push(`    ${l}`));
          }
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
  lineas.push(separador);
  // const totalTexto = `TOTAL: $${comanda.total.toLocaleString('es-CO')}`;
  // lineas.push(totalTexto);
  lineas.push(separador);
  
  // Observaciones generales
  if (comanda.observaciones_generales && comanda.observaciones_generales.trim() !== '') {
    lineas.push('');
    lineas.push('OBSERVACIONES GENERALES:');
    const obsLineas = dividirTexto(comanda.observaciones_generales, ANCHO_LINEA);
    obsLineas.forEach(l => lineas.push(l));
    lineas.push(separador);
  }
  
  lineas.push('');
  lineas.push('     ENVIADO A COCINA');
  lineas.push(separador);
  lineas.push('');
  lineas.push('');
  lineas.push('');
  
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

// Función principal para imprimir comanda
export const imprimirComanda = async (comanda: Comanda): Promise<void> => {
  let comandaCompleta = comanda;
  
  try {
    console.log('🖨️  ===== FUNCIÓN IMPRIMIR COMANDA LLAMADA =====');
    console.log('🖨️  ID Comanda:', comanda.id);
    console.log('🖨️  Items en comanda:', comanda.items?.length || 0);
    console.log('🖨️  Intentando imprimir comanda...');
    
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
    
    // Intentar imprimir con diferentes métodos
    const metodosImpresion = [
      PRINTER_COCINA_NAME, // Usar variable de entorno principal
      'POS-58', // Intentar con nombre exacto
      'pos58',  // Intentar con minúsculas
    ];
    
    let impresionExitosa = false;
    
    for (const nombreImpresora of metodosImpresion) {
      try {
        console.log(`🖨️  Intentando imprimir con: ${nombreImpresora}`);
        
        // Crear archivo temporal con codificación adecuada
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFile = path.join(tempDir, `comanda_${Date.now()}.txt`);
        
        // Escribir con BOM UTF-8 para mejor compatibilidad
        const BOM = '\uFEFF';
        fs.writeFileSync(tempFile, BOM + contenidoComanda, 'utf8');
        
        console.log(`📄 Archivo temporal creado: ${tempFile}`);
        
        // Métodos múltiples de impresión
        const comandos = [
          // Método 1: PowerShell con Out-Printer
          `powershell -Command "$content = Get-Content -Path '${tempFile}' -Raw -Encoding UTF8; $content | Out-Printer -Name '${nombreImpresora}'"`,
          // Método 2: type + copy (Windows clásico)
          `cmd /c "type \\"${tempFile}\\" > \\"\\\\\\\\%COMPUTERNAME%\\\\${nombreImpresora}\\"" 2>nul`,
          // Método 3: print (Windows)
          `cmd /c "print /D:\\"${nombreImpresora}\\" \\"${tempFile}\\"" 2>nul`
        ];
        
        let comandoExitoso = false;
        
        for (const comando of comandos) {
          try {
            console.log(`🔄 Probando método de impresión...`);
            await execAsync(comando, { timeout: 15000 });
            comandoExitoso = true;
            console.log(`✅ Impresión exitosa con: ${nombreImpresora}`);
            break;
          } catch (cmdError) {
            console.log(`⚠️  Método falló, probando siguiente...`);
            continue;
          }
        }
        
        if (comandoExitoso) {
          impresionExitosa = true;
          
          // Limpiar archivo temporal después de un pequeño delay
          setTimeout(() => {
            try {
              if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
            } catch (e) {
              console.log('⚠️  No se pudo eliminar archivo temporal');
            }
          }, 2000);
          
          break;
        }
        
      } catch (error) {
        console.log(`❌ Error con ${nombreImpresora}:`, error instanceof Error ? error.message : 'Error desconocido');
      }
    }
    
    if (!impresionExitosa) {
      console.log('⚠️  No se pudo imprimir físicamente, mostrando en consola...');
      imprimirEnConsola(comandaCompleta);
    }
    
  } catch (error) {
    console.error('❌ Error general al imprimir:', error);
    console.log('🔄 Usando modo de impresión por consola...');
    imprimirEnConsola(comandaCompleta);
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

// Función para imprimir factura (por ahora en consola)
export const imprimirFactura = async (comandaId: string): Promise<void> => {
  try {
    const comanda = await obtenerComandaCompleta(comandaId);
    imprimirFacturaEnConsola(comanda);
  } catch (error) {
    console.error('Error al imprimir factura:', error);
    throw error;
  }
};

// Función para imprimir en consola (modo desarrollo)
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
          if (personalizacion.caldo) {
            console.log(`       🥄 Caldo: ${personalizacion.caldo.nombre}`);
          }
          if (personalizacion.principio) {
            console.log(`       🍽️ Principio: ${personalizacion.principio.nombre}`);
          }
          if (personalizacion.proteina) {
            console.log(`       🥩 Proteína: ${personalizacion.proteina.nombre}`);
          }
          if (personalizacion.bebida) {
            console.log(`       ☕ Bebida: ${personalizacion.bebida.nombre}`);
          }
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

// Función para probar la conexión de la impresora
export const probarImpresora = async (): Promise<boolean> => {
  try {
    console.log('🖨️  Probando impresoras disponibles...');
    
    // Obtener lista de impresoras
    const { stdout } = await execAsync('wmic printer get name', { timeout: 5000 });
    const impresoras = stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line !== 'Name')
      .filter(line => line.length > 0);
    
    console.log('� Impresoras disponibles:', impresoras);
    
    const metodosImpresion = [
      PRINTER_COCINA_NAME,
    ];
    
    let impresionExitosa = false;
    
    for (const nombreImpresora of metodosImpresion) {
      // Verificar si la impresora está en la lista
      const impresora = impresoras.find(imp => imp.toLowerCase().includes(nombreImpresora.toLowerCase()));
      
      if (impresora) {
        try {
          console.log(`🖨️  Probando impresora: ${nombreImpresora}`);
          
          // Crear contenido de prueba
          const contenidoPrueba = `
=====================================
           CASA MONTIS
         PRUEBA DE IMPRESORA
=====================================
Fecha: ${new Date().toLocaleString('es-CO')}
Impresora: ${nombreImpresora}
Estado: Conectada
=====================================
Si ve este mensaje,
la impresora funciona correctamente.
=====================================
          `;
          
          // Crear archivo temporal
          const tempDir = path.join(process.cwd(), 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFile = path.join(tempDir, `prueba_${Date.now()}.txt`);
          fs.writeFileSync(tempFile, contenidoPrueba, 'utf8');
          
          // Intentar imprimir usando PowerShell
          const comando = `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${nombreImpresora}'"`;
          
          await execAsync(comando, { timeout: 10000 });
          
          console.log(`✅ Prueba de impresión exitosa con ${nombreImpresora}`);
          impresionExitosa = true;
          
          // Limpiar archivo temporal
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            console.log('⚠️  No se pudo eliminar archivo temporal');
          }
          
          break;
        } catch (error) {
          console.log(`❌ Error con ${nombreImpresora}:`, error instanceof Error ? error.message : 'Error desconocido');
        }
      } else {
        console.log(`⚠️  Impresora ${nombreImpresora} no encontrada en el sistema`);
      }
    }
    
    if (!impresionExitosa) {
      console.log('❌ No se pudo conectar a ninguna impresora física');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error general al probar impresora:', error);
    return false;
  }
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
