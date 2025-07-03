import { db } from './init';

// Crear tabla de control de migraciones
export async function initMigrationControl(): Promise<void> {
  return new Promise((resolve, reject) => {
    const createTable = `
      CREATE TABLE IF NOT EXISTS migration_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(createTable, (err) => {
      if (err) {
        console.error('Error al crear tabla de migraciones:', err);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

// Verificar si una migración ya se ejecutó
export async function migrationExists(migrationName: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM migration_history WHERE migration_name = ?',
      [migrationName],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(!!row);
      }
    );
  });
}

// Marcar una migración como ejecutada
export async function markMigrationExecuted(migrationName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR IGNORE INTO migration_history (migration_name) VALUES (?)',
      [migrationName],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

// Migración para corregir los salones - solo una vez
export async function migracionSalones_v1(): Promise<void> {
  const migrationName = 'salones_v1';
  
  if (await migrationExists(migrationName)) {
    console.log('✅ Migración de salones ya ejecutada anteriormente');
    return;
  }

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Solo crear salones si no existen
      db.get('SELECT COUNT(*) as count FROM salones', (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          const insertSalones = `
            INSERT INTO salones (nombre, descripcion, activo) VALUES
            ('Principal', 'Salón principal del restaurante', 1),
            ('Salón 1', 'Primer salón adicional', 1),
            ('Salón 2', 'Segundo salón adicional', 1),
            ('Salón 3', 'Tercer salón adicional', 1),
            ('Salón 4', 'Cuarto salón adicional', 1),
            ('Salón 5', 'Quinto salón adicional', 1)
          `;

          db.run(insertSalones, (err) => {
            if (err) {
              reject(err);
              return;
            }

            // Solo asignar salon_id a mesas que no lo tienen
            db.run('UPDATE mesas SET salon_id = 1 WHERE salon_id IS NULL OR salon_id = 0', (err) => {
              if (err) {
                reject(err);
                return;
              }

              markMigrationExecuted(migrationName).then(() => {
                console.log('✅ Migración de salones v1 completada');
                resolve();
              }).catch(reject);
            });
          });
        } else {
          // Solo asignar salon_id a mesas que no lo tienen
          db.run('UPDATE mesas SET salon_id = 1 WHERE salon_id IS NULL OR salon_id = 0', (err) => {
            if (err) {
              reject(err);
              return;
            }

            markMigrationExecuted(migrationName).then(() => {
              console.log('✅ Migración de salones v1 completada (salones ya existían)');
              resolve();
            }).catch(reject);
          });
        }
      });
    });
  });
}
