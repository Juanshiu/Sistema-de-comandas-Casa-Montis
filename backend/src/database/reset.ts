import { db } from './database';
import { sql } from 'kysely';

export async function fullDatabaseReset() {
  console.log('🔄 Iniciando reseteo completo de base de datos...');
  
  // En PostgreSQL esto es más complejo que simplemente borrar un archivo.
  // Por ahora, truncamos las tablas principales respetando el orden de FKs.
  const tables = [
    'facturas',
    'comanda_mesas',
    'comanda_items',
    'comandas',
    'items_personalizacion',
    'personalizacion_insumos',
    'producto_insumos',
    'productos',
    'insumos',
    'mesas',
    'salones',
    'nomina_detalles',
    'nominas',
    'contratos',
    'empleados'
  ];

  try {
    for (const table of tables) {
      await sql`TRUNCATE TABLE ${sql.table(table)} CASCADE`.execute(db);
    }
    console.log('✅ Base de datos reseteada exitosamente (Tablas truncadas)');
  } catch (error) {
    console.error('❌ Error durante el reseteo de la base de datos:', error);
    throw error;
  }
}
