import { db } from './init';

/**
 * Migración: Crear tabla de categorías para productos y migrar datos existentes
 * 
 * Esta migración:
 * 1. Crea tabla categorias_productos con estructura apropiada
 * 2. Extrae categorías únicas de la tabla productos
 * 3. Inserta categorías en la nueva tabla
 * 4. NO modifica tabla productos (para mantener compatibilidad)
 */

async function ejecutarMigracion() {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      console.log('🔄 Iniciando migración de categorías de productos...');

      // Paso 1: Crear tabla de categorías
      db.run(`
        CREATE TABLE IF NOT EXISTS categorias_productos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL UNIQUE,
          descripcion TEXT,
          activo INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err: any) => {
        if (err) {
          console.error('❌ Error al crear tabla categorias_productos:', err);
          reject(err);
          return;
        }
        console.log('✅ Tabla categorias_productos creada exitosamente');

        // Paso 2: Obtener categorías únicas de productos existentes
        db.all('SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != ""', [], (err: any, rows: any[]) => {
          if (err) {
            console.error('❌ Error al obtener categorías existentes:', err);
            reject(err);
            return;
          }

          console.log(`📋 Encontradas ${rows.length} categorías únicas en productos`);

          if (rows.length === 0) {
            console.log('✅ Migración completada (no hay categorías para migrar)');
            resolve();
            return;
          }

          // Paso 3: Insertar categorías en la nueva tabla
          let insertados = 0;
          let errores = 0;

          rows.forEach((row, index) => {
            const categoria = row.categoria;
            
            db.run(
              'INSERT OR IGNORE INTO categorias_productos (nombre, activo) VALUES (?, 1)',
              [categoria],
              (err: any) => {
                if (err) {
                  console.error(`❌ Error al insertar categoría "${categoria}":`, err);
                  errores++;
                } else {
                  insertados++;
                  console.log(`✅ Categoría insertada: ${categoria}`);
                }

                // Verificar si es la última iteración
                if (index === rows.length - 1) {
                  console.log('\n📊 Resumen de migración:');
                  console.log(`   - Categorías insertadas: ${insertados}`);
                  console.log(`   - Errores: ${errores}`);
                  console.log('✅ Migración completada exitosamente\n');
                  resolve();
                }
              }
            );
          });
        });
      });
    });
  });
}

// Ejecutar migración
if (require.main === module) {
  ejecutarMigracion()
    .then(() => {
      console.log('🎉 Migración finalizada');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Error durante la migración:', err);
      process.exit(1);
    });
}

export { ejecutarMigracion };
