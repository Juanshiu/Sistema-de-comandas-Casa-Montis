import { db } from './init';

/**
 * Migración: Agregar sistema de inventario a productos
 * Fecha: 2026-01-02
 * Descripción: Permite controlar inventario de productos con cantidad inicial y actual
 */

console.log('🔄 Iniciando migración: agregar sistema de inventario a productos...');

db.serialize(() => {
  // Verificar si las columnas ya existen
  db.all("PRAGMA table_info(productos)", [], (err: any, columns: any[]) => {
    if (err) {
      console.error('❌ Error al verificar estructura de productos:', err);
      process.exit(1);
    }

    const tieneUsaInventario = columns.some(col => col.name === 'usa_inventario');
    const tieneCantidadInicial = columns.some(col => col.name === 'cantidad_inicial');
    const tieneCantidadActual = columns.some(col => col.name === 'cantidad_actual');

    if (tieneUsaInventario && tieneCantidadInicial && tieneCantidadActual) {
      console.log('✅ Las columnas de inventario ya existen');
      process.exit(0);
    }

    let completadas = 0;
    const totalColumnas = 3;

    const verificarCompletado = () => {
      completadas++;
      if (completadas === totalColumnas) {
        console.log('✅ Todas las columnas agregadas exitosamente');
        console.log('✅ Migración completada');
        process.exit(0);
      }
    };

    // Agregar columna usa_inventario si no existe
    if (!tieneUsaInventario) {
      db.run(
        'ALTER TABLE productos ADD COLUMN usa_inventario INTEGER DEFAULT 0',
        (err: any) => {
          if (err) {
            console.error('❌ Error al agregar columna usa_inventario:', err);
            process.exit(1);
          }
          console.log('✅ Columna usa_inventario agregada');
          verificarCompletado();
        }
      );
    } else {
      verificarCompletado();
    }

    // Agregar columna cantidad_inicial si no existe
    if (!tieneCantidadInicial) {
      db.run(
        'ALTER TABLE productos ADD COLUMN cantidad_inicial INTEGER',
        (err: any) => {
          if (err) {
            console.error('❌ Error al agregar columna cantidad_inicial:', err);
            process.exit(1);
          }
          console.log('✅ Columna cantidad_inicial agregada');
          verificarCompletado();
        }
      );
    } else {
      verificarCompletado();
    }

    // Agregar columna cantidad_actual si no existe
    if (!tieneCantidadActual) {
      db.run(
        'ALTER TABLE productos ADD COLUMN cantidad_actual INTEGER',
        (err: any) => {
          if (err) {
            console.error('❌ Error al agregar columna cantidad_actual:', err);
            process.exit(1);
          }
          console.log('✅ Columna cantidad_actual agregada');
          verificarCompletado();
        }
      );
    } else {
      verificarCompletado();
    }
  });
});
