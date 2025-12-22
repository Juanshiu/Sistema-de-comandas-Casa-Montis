import sqlite3 from 'sqlite3';
import path from 'path';

const db = new sqlite3.Database(path.join(__dirname, '../../database/casa_montis.db'));

console.log('🔄 Iniciando migración para agregar campo disponible a personalizaciones...');

db.serialize(() => {
  try {
    db.run('BEGIN TRANSACTION');

    // Agregar columna disponible a items_personalizacion
    console.log('📋 Agregando columna disponible a items_personalizacion...');
    db.run(`
      ALTER TABLE items_personalizacion 
      ADD COLUMN disponible BOOLEAN DEFAULT 1
    `, (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log('⚠️ La columna disponible ya existe en items_personalizacion');
        } else {
          console.error('Error al agregar columna a items_personalizacion:', err);
          db.run('ROLLBACK');
          db.close();
          return;
        }
      } else {
        console.log('✅ Columna disponible agregada a items_personalizacion');
      }
    });

    // Agregar columna disponible a caldos
    console.log('📋 Agregando columna disponible a caldos...');
    db.run(`
      ALTER TABLE caldos 
      ADD COLUMN disponible BOOLEAN DEFAULT 1
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar columna a caldos:', err);
      } else {
        console.log('✅ Columna disponible agregada/verificada en caldos');
      }
    });

    // Agregar columna disponible a principios
    console.log('📋 Agregando columna disponible a principios...');
    db.run(`
      ALTER TABLE principios 
      ADD COLUMN disponible BOOLEAN DEFAULT 1
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar columna a principios:', err);
      } else {
        console.log('✅ Columna disponible agregada/verificada en principios');
      }
    });

    // Agregar columna disponible a proteinas
    console.log('📋 Agregando columna disponible a proteinas...');
    db.run(`
      ALTER TABLE proteinas 
      ADD COLUMN disponible BOOLEAN DEFAULT 1
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar columna a proteinas:', err);
      } else {
        console.log('✅ Columna disponible agregada/verificada en proteinas');
      }
    });

    // Agregar columna disponible a bebidas
    console.log('📋 Agregando columna disponible a bebidas...');
    db.run(`
      ALTER TABLE bebidas 
      ADD COLUMN disponible BOOLEAN DEFAULT 1
    `, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error al agregar columna a bebidas:', err);
      } else {
        console.log('✅ Columna disponible agregada/verificada en bebidas');
      }

      // Commit después de la última operación
      setTimeout(() => {
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error al hacer commit:', err);
            db.run('ROLLBACK');
          } else {
            console.log('✅ Migración completada exitosamente');
            console.log('📝 Todas las personalizaciones ahora tienen el campo "disponible"');
          }
          db.close();
        });
      }, 1000);
    });

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    db.run('ROLLBACK');
    db.close();
  }
});
