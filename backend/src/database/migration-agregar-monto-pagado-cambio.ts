import { db } from './init';

/**
 * Migración: Agregar campos monto_pagado y cambio a la tabla facturas
 * Fecha: 2026-01-01
 * Descripción: Permite guardar el monto pagado y el cambio para reimprimir recibos con datos exactos
 */

console.log('🔄 Iniciando migración: agregar monto_pagado y cambio a facturas...');

db.serialize(() => {
  // Verificar si las columnas ya existen
  db.all("PRAGMA table_info(facturas)", [], (err: any, columns: any[]) => {
    if (err) {
      console.error('❌ Error al verificar estructura de facturas:', err);
      process.exit(1);
    }

    const tieneMontoPagado = columns.some(col => col.name === 'monto_pagado');
    const tieneCambio = columns.some(col => col.name === 'cambio');

    if (tieneMontoPagado && tieneCambio) {
      console.log('✅ Las columnas monto_pagado y cambio ya existen');
      process.exit(0);
    }

    // Agregar columna monto_pagado si no existe
    if (!tieneMontoPagado) {
      db.run(
        'ALTER TABLE facturas ADD COLUMN monto_pagado REAL',
        (err: any) => {
          if (err) {
            console.error('❌ Error al agregar columna monto_pagado:', err);
            process.exit(1);
          }
          console.log('✅ Columna monto_pagado agregada');
        }
      );
    }

    // Agregar columna cambio si no existe
    if (!tieneCambio) {
      db.run(
        'ALTER TABLE facturas ADD COLUMN cambio REAL DEFAULT 0',
        (err: any) => {
          if (err) {
            console.error('❌ Error al agregar columna cambio:', err);
            process.exit(1);
          }
          console.log('✅ Columna cambio agregada');
          
          // Actualizar facturas existentes
          db.run(
            `UPDATE facturas 
             SET monto_pagado = total, 
                 cambio = 0 
             WHERE monto_pagado IS NULL`,
            (err: any) => {
              if (err) {
                console.error('❌ Error al actualizar facturas existentes:', err);
                process.exit(1);
              }
              console.log('✅ Facturas existentes actualizadas con monto_pagado = total y cambio = 0');
              console.log('✅ Migración completada exitosamente');
              process.exit(0);
            }
          );
        }
      );
    }
  });
});
