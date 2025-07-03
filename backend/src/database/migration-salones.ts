import { db } from './init';

export async function crearTablaSalones(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Crear tabla de salones si no existe
    const createSalonesTable = `
      CREATE TABLE IF NOT EXISTS salones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        descripcion TEXT,
        activo BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(createSalonesTable, (err) => {
      if (err) {
        console.error('Error al crear tabla salones:', err);
        reject(err);
        return;
      }

      // Verificar si ya existen salones
      db.get('SELECT COUNT(*) as count FROM salones', (err, row: any) => {
        if (err) {
          console.error('Error al verificar salones:', err);
          reject(err);
          return;
        }

        // Si no hay salones, crear algunos por defecto
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
              console.error('Error al insertar salones por defecto:', err);
              reject(err);
              return;
            }
            console.log('✅ Salones por defecto creados');
            resolve();
          });
        } else {
          console.log('✅ Tabla salones ya existe con datos');
          resolve();
        }
      });
    });
  });
}

export async function actualizarEstructuraMesas(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar si la columna salon_id ya existe
    db.all("PRAGMA table_info(mesas)", (err, columns: any[]) => {
      if (err) {
        console.error('Error al verificar estructura de mesas:', err);
        reject(err);
        return;
      }

      const tieneColumnasalon = columns.some(col => col.name === 'salon_id');
      
      if (!tieneColumnasalon) {
        // Agregar columna salon_id
        db.run('ALTER TABLE mesas ADD COLUMN salon_id INTEGER REFERENCES salones(id)', (err) => {
          if (err) {
            console.error('Error al agregar columna salon_id:', err);
            reject(err);
            return;
          }
          
          // Asignar el salón principal solo a las mesas que NO tienen salon_id
          db.run('UPDATE mesas SET salon_id = 1 WHERE salon_id IS NULL OR salon_id = 0', (err) => {
            if (err) {
              console.error('Error al asignar salón principal:', err);
              reject(err);
              return;
            }
            console.log('✅ Estructura de mesas actualizada con salon_id (solo mesas sin salón asignado)');
            resolve();
          });
        });
      } else {
        console.log('✅ Estructura de mesas ya está actualizada');
        resolve();
      }
    });
  });
}

export async function migrarSalonesYMesas(): Promise<void> {
  try {
    await crearTablaSalones();
    await actualizarEstructuraMesas();
    console.log('✅ Migración de salones y mesas completada');
  } catch (error) {
    console.error('❌ Error en migración de salones y mesas:', error);
    throw error;
  }
}
