import { db } from './init';

/**
 * Migración para agregar campos de personalización a la tabla productos
 */
export const migrarPersonalizacionesProductos = () => {
  console.log('🔄 Verificando campos de personalización en productos...');

  db.serialize(() => {
    // Agregar campo tiene_personalizacion
    db.run(`
      ALTER TABLE productos ADD COLUMN tiene_personalizacion INTEGER DEFAULT 0
    `, (err: any) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar tiene_personalizacion:', err);
      } else if (!err) {
        console.log('✅ Campo tiene_personalizacion agregado');
      }
    });

    // Agregar campo personalizaciones_habilitadas
    db.run(`
      ALTER TABLE productos ADD COLUMN personalizaciones_habilitadas TEXT
    `, (err: any) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar personalizaciones_habilitadas:', err);
      } else if (!err) {
        console.log('✅ Campo personalizaciones_habilitadas agregado');
      }
    });

    console.log('✅ Migración de campos de productos completada');
  });
};

// Ejecutar migración si este archivo se ejecuta directamente
if (require.main === module) {
  migrarPersonalizacionesProductos();
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}
