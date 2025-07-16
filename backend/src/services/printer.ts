import { db } from '../database/init';
import { Comanda } from '../models';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Función para crear un archivo de texto con formato de comanda
const crearArchivoComanda = (comanda: Comanda): string => {
  const contenido = `
=====================================
           CASA MONTIS
         COMANDA DE COCINA
=====================================
ID: ${comanda.id.substring(0, 8)}
Fecha: ${comanda.fecha_creacion?.toLocaleString('es-CO', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})}
Mesero: ${comanda.mesero}
${comanda.mesas && comanda.mesas.length > 0 ? `Mesa(s): ${comanda.mesas.map(m => `${m.salon}-${m.numero}`).join(', ')}` : ''}
${comanda.mesas && comanda.mesas.length > 0 ? `Capacidad: ${comanda.mesas.reduce((sum, mesa) => sum + mesa.capacidad, 0)} personas` : ''}
=====================================
               PRODUCTOS
=====================================

${comanda.items && comanda.items.length > 0 ? comanda.items.map((item, index) => {
  let texto = `${item.cantidad}x ${item.producto?.nombre || 'Producto'}
   $${item.precio_unitario.toLocaleString('es-CO')} c/u
   Subtotal: $${item.subtotal.toLocaleString('es-CO')}`;
  
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
      texto += `\n   PERSONALIZACION:`;
      if (personalizacion.caldo) {
        texto += `\n     Caldo: ${personalizacion.caldo.nombre}`;
      }
      if (personalizacion.principio) {
        texto += `\n     Principio: ${personalizacion.principio.nombre}`;
      }
      if (personalizacion.proteina) {
        texto += `\n     Proteina: ${personalizacion.proteina.nombre}`;
      }
      if (personalizacion.bebida) {
        texto += `\n     Bebida: ${personalizacion.bebida.nombre}`;
      }
    }
  }
  
  // Observaciones del item
  if (item.observaciones) {
    texto += `\n   OBS: ${item.observaciones}`;
  }
  
  return texto;
}).join('\n\n') : 'No hay items'}

=====================================
TOTAL: $${comanda.total.toLocaleString('es-CO')}
=====================================
${comanda.observaciones_generales ? `\nObservaciones generales:\n${comanda.observaciones_generales}\n` : ''}
=====================================
         ENVIADO A COCINA
     ${new Date().toLocaleTimeString('es-CO')}
=====================================
  `.trim();
  
  return contenido;
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
          
          const comanda = {
            ...comandaRow,
            mesas: mesasRows,
            items: itemsRows
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
    console.log('🖨️  Intentando imprimir comanda...');
    
    // Obtener datos completos de la comanda si no los tiene
    if (!comanda.items || comanda.items.length === 0) {
      console.log('🔄 Obteniendo datos completos de la comanda...');
      comandaCompleta = await obtenerComandaCompleta(comanda.id);
    }
    
    // Crear contenido de la comanda
    const contenidoComanda = crearArchivoComanda(comandaCompleta);
    
    // Intentar imprimir con diferentes métodos
    const metodosImpresion = [
      'POS-58',
      'Xprinter USB Printer Port',
      'POS58'
    ];
    
    let impresionExitosa = false;
    
    for (const nombreImpresora of metodosImpresion) {
      try {
        console.log(`🖨️  Intentando imprimir con: ${nombreImpresora}`);
        
        // Crear archivo temporal
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFile = path.join(tempDir, `comanda_${Date.now()}.txt`);
        fs.writeFileSync(tempFile, contenidoComanda, 'utf8');
        
        // Intentar imprimir usando PowerShell
        const comando = `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${nombreImpresora}'"`;
        
        await execAsync(comando, { timeout: 10000 });
        
        console.log(`✅ Comanda impresa exitosamente con ${nombreImpresora}`);
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
      'POS-58',
      'Xprinter USB Printer Port',
      'POS58'
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
