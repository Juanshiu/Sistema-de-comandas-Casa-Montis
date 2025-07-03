import { db } from './init';

export async function corregirEstructuraSalones(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Primero, crear los salones correctos
      db.run(`DELETE FROM salones`, (err) => {
        if (err) {
          console.error('Error al limpiar salones:', err);
          reject(err);
          return;
        }

        // Insertar los salones correctos
        const insertSalones = `
          INSERT INTO salones (id, nombre, descripcion, activo) VALUES
          (1, 'Principal', 'Salón principal del restaurante', 1),
          (2, 'Salón 1', 'Primer salón adicional', 1),
          (3, 'Salón 2', 'Segundo salón adicional', 1),
          (4, 'Salón 3', 'Tercer salón adicional', 1),
          (5, 'Salón 4', 'Cuarto salón adicional', 1),
          (6, 'Salón 5', 'Quinto salón adicional', 1)
        `;

        db.run(insertSalones, (err) => {
          if (err) {
            console.error('Error al insertar salones correctos:', err);
            reject(err);
            return;
          }

          // 2. Actualizar las mesas para usar salon_id en lugar de salon
          // Mapear los nombres de salón a IDs
          const updateQueries = [
            `UPDATE mesas SET salon_id = 1 WHERE salon = 'Principal'`,
            `UPDATE mesas SET salon_id = 2 WHERE salon = 'Salón 1'`,
            `UPDATE mesas SET salon_id = 3 WHERE salon = 'Salón 2'`,
            `UPDATE mesas SET salon_id = 4 WHERE salon = 'Salón 3'`,
            `UPDATE mesas SET salon_id = 5 WHERE salon = 'Salón 4'`,
            `UPDATE mesas SET salon_id = 6 WHERE salon = 'Salón 5'`,
            // Asignar al principal las que no tengan salón específico
            `UPDATE mesas SET salon_id = 1 WHERE salon_id IS NULL`
          ];

          let completedQueries = 0;
          updateQueries.forEach((query) => {
            db.run(query, (err) => {
              if (err) {
                console.error('Error al actualizar mesas:', err);
              }
              completedQueries++;
              if (completedQueries === updateQueries.length) {
                console.log('✅ Estructura de salones y mesas corregida');
                resolve();
              }
            });
          });
        });
      });
    });
  });
}

export async function limpiarColumnaSalon(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Crear nueva tabla sin la columna salon
    const createNewTable = `
      CREATE TABLE mesas_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero TEXT NOT NULL UNIQUE,
        capacidad INTEGER NOT NULL,
        salon_id INTEGER REFERENCES salones(id),
        ocupada BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(createNewTable, (err) => {
      if (err) {
        console.error('Error al crear nueva tabla mesas:', err);
        reject(err);
        return;
      }

      // Copiar datos de la tabla antigua a la nueva
      const copyData = `
        INSERT INTO mesas_new (id, numero, capacidad, salon_id, ocupada, created_at, updated_at)
        SELECT id, numero, capacidad, salon_id, ocupada, created_at, updated_at
        FROM mesas
      `;

      db.run(copyData, (err) => {
        if (err) {
          console.error('Error al copiar datos:', err);
          reject(err);
          return;
        }

        // Eliminar tabla antigua
        db.run('DROP TABLE mesas', (err) => {
          if (err) {
            console.error('Error al eliminar tabla antigua:', err);
            reject(err);
            return;
          }

          // Renombrar nueva tabla
          db.run('ALTER TABLE mesas_new RENAME TO mesas', (err) => {
            if (err) {
              console.error('Error al renombrar tabla:', err);
              reject(err);
              return;
            }

            console.log('✅ Columna salon eliminada de la tabla mesas');
            resolve();
          });
        });
      });
    });
  });
}
