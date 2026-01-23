import { db, initDatabase } from './init';
import { initMigrationControl } from './migration-control';
import { crearTablasPersonalizaciones } from './migration-personalizaciones';
import { migracionSalones_v1 } from './migration-control';
import { migrarMultiplesMesas } from './migration-multiples-mesas';
import { migrarPersonalizacionesProductos } from './migration-personalizaciones-productos';
import { migrarUsuariosYRoles } from './migration-usuarios-roles';
import { ejecutarMigracionConfigFacturacion } from './migration-config-facturacion';
import { migrarInventarioAvanzado } from './migration-inventario-avanzado';
import { migrarNomina } from './migration-nomina';
import { migrarContratos } from './migration-contratos';
import { migrarColumnasComandas } from './migration-fix-comandas-columns';
import { migrarCategoriasProductos } from './migration-categorias-productos';
import { updateDatabaseWithProducts } from './update';

/**
 * Resetea completamente la base de datos eliminando todas las tablas
 * y recreándolas mediante las migraciones existentes.
 */
export async function fullDatabaseReset(): Promise<void> {
  try {
    console.log('🔄 Iniciando reseteo total de la base de datos...');
    
    // 1. Guardar información del admin para preservarlo
    let adminInfo: any = null;
    try {
      adminInfo = await new Promise((res) => {
        db.get("SELECT * FROM usuarios WHERE usuario = 'admin@casamontis'", (err, row) => res(row));
      });
    } catch (e) {
      console.log('ℹ️ No se pudo respaldar admin (posiblemente tablas no existen aún)');
    }

    // 2. Desactivar llaves foráneas temporalmente
    await new Promise<void>((res, rej) => db.run('PRAGMA foreign_keys = OFF', err => err ? rej(err) : res()));

    // 3. Obtener todas las tablas existentes
    const tables = await new Promise<any[]>((res, rej) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", (err, rows) => {
        if (err) rej(err);
        else res(rows);
      });
    });

    console.log(`🗑️ Borrando ${tables.length} tablas...`);

    // 4. Borrar todas las tablas
    for (const table of tables) {
      await new Promise<void>((res, rej) => {
        db.run(`DROP TABLE IF EXISTS "${table.name}"`, err => {
          if (err) {
            console.error(`❌ Error al borrar tabla ${table.name}:`, err);
            rej(err);
          } else {
            res();
          }
        });
      });
    }

    // 5. Reactivar llaves foráneas
    await new Promise<void>((res, rej) => db.run('PRAGMA foreign_keys = ON', err => err ? rej(err) : res()));

    console.log('✅ Base de datos vaciada. Iniciando reconstrucción...');

    // 6. Ejecutar toda la secuencia de inicialización en orden estricto
    await initDatabase();
    console.log('✅ InitDatabase completado');
    
    await initMigrationControl();
    console.log('✅ MigrationControl completado');
    
    await crearTablasPersonalizaciones();
    console.log('✅ Tablas de personalizaciones completadas');

    // Migración de categorías de productos (nueva tabla)
    await migrarCategoriasProductos();
    console.log('✅ Migración de categorías de productos completada');
    
    // Llamar con false para no re-insertar salones por defecto
    await migracionSalones_v1(false);
    console.log('✅ Migración de salones completada (sin datos iniciales)');
    
    await migrarMultiplesMesas();
    console.log('✅ Migración de múltiples mesas completada');
    
    await migrarPersonalizacionesProductos();
    console.log('✅ Migración de personalizaciones en productos completada');
    
    await migrarUsuariosYRoles();
    console.log('✅ Migración de usuarios y roles completada');
    
    // Llamar con false para no re-insertar datos de empresa por defecto
    await ejecutarMigracionConfigFacturacion(false);
    console.log('✅ Migración de configuración de facturación completada (sin datos iniciales)');
    
    await migrarInventarioAvanzado();
    console.log('✅ Migración de inventario avanzado completada');
    
    await migrarNomina();
    console.log('✅ Migración de nómina completada');
    
    await migrarContratos();
    console.log('✅ Migración de contratos completada');
    
    await migrarColumnasComandas();
    console.log('✅ Migración de columnas de comandas completada');
    
    // NO ejecutamos updateDatabaseWithProducts para que no cargue productos iniciales
    // await updateDatabaseWithProducts();
    // console.log('✅ Inserción de productos completada');

    // 7. Restaurar admin si se respaldó
    if (adminInfo) {
      console.log('👤 Restaurando credenciales de administrador...');
      await new Promise<void>((res) => {
        db.run("UPDATE usuarios SET password_hash = ?, nombre_completo = ?, pin = ?, telefono = ? WHERE usuario = 'admin@casamontis'",
          [adminInfo.password_hash, adminInfo.nombre_completo, adminInfo.pin, adminInfo.telefono],
          (err) => {
            if (err) console.error('Error al restaurar admin:', err);
            res();
          }
        );
      });
    }

    console.log('✅ Base de datos reseteada y reconstruida exitosamente.');
  } catch (error) {
    console.error('❌ Error fatal durante el reseteo de la base de datos:', error);
    throw error;
  }
}
