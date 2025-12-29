import { db } from './init';

/**
 * Migración: Agregar sistema de inventario a personalizaciones
 * - usa_inventario: indica si el item usa control de inventario
 * - cantidad_inicial: cantidad inicial/de referencia
 * - cantidad_actual: cantidad disponible actual
 */

console.log('🔄 Iniciando migración: Inventario de personalizaciones...');

db.serialize(() => {
  // Verificar si las columnas ya existen
  db.all("PRAGMA table_info(items_personalizacion)", [], (err: any, columns: any[]) => {
    if (err) {
      console.error('❌ Error al verificar estructura de tabla:', err);
      process.exit(1);
    }

    const columnNames = columns.map(col => col.name);
    const columnasNuevas: string[] = [];

    if (!columnNames.includes('usa_inventario')) {
      columnasNuevas.push('usa_inventario');
    }
    if (!columnNames.includes('cantidad_inicial')) {
      columnasNuevas.push('cantidad_inicial');
    }
    if (!columnNames.includes('cantidad_actual')) {
      columnasNuevas.push('cantidad_actual');
    }

    if (columnasNuevas.length === 0) {
      console.log('✅ Las columnas de inventario ya existen. No se requiere migración.');
      process.exit(0);
      return;
    }

    console.log(`📝 Agregando columnas: ${columnasNuevas.join(', ')}`);

    db.run('BEGIN TRANSACTION');

    const queries = [];

    if (columnasNuevas.includes('usa_inventario')) {
      queries.push(
        'ALTER TABLE items_personalizacion ADD COLUMN usa_inventario INTEGER DEFAULT 0 NOT NULL'
      );
    }

    if (columnasNuevas.includes('cantidad_inicial')) {
      queries.push(
        'ALTER TABLE items_personalizacion ADD COLUMN cantidad_inicial INTEGER DEFAULT NULL'
      );
    }

    if (columnasNuevas.includes('cantidad_actual')) {
      queries.push(
        'ALTER TABLE items_personalizacion ADD COLUMN cantidad_actual INTEGER DEFAULT NULL'
      );
    }

    let completed = 0;
    let hasError = false;

    queries.forEach((query, index) => {
      db.run(query, (err: any) => {
        if (err) {
          console.error(`❌ Error en query ${index + 1}:`, err);
          hasError = true;
          db.run('ROLLBACK');
          process.exit(1);
          return;
        }

        completed++;

        if (completed === queries.length && !hasError) {
          db.run('COMMIT', (err: any) => {
            if (err) {
              console.error('❌ Error al hacer COMMIT:', err);
              process.exit(1);
              return;
            }

            console.log('✅ Migración completada exitosamente');
            console.log('📊 Columnas agregadas:', columnasNuevas.join(', '));
            console.log('');
            console.log('ℹ️  Notas:');
            console.log('   - usa_inventario: 0 = no usa inventario, 1 = usa inventario');
            console.log('   - cantidad_inicial: cantidad de referencia (puede ser NULL si no usa inventario)');
            console.log('   - cantidad_actual: cantidad disponible (puede ser NULL si no usa inventario)');
            console.log('   - Cuando cantidad_actual = 0, el item se marca automáticamente como no disponible');
            
            process.exit(0);
          });
        }
      });
    });
  });
});
