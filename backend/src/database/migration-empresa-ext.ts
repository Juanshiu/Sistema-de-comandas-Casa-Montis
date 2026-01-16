import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../database/casa_montis.db');

export async function ejecutarMigracionEmpresaExt() {
  return new Promise<void>((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    db.serialize(() => {
      // Añadir nuevas columnas a config_facturacion
      const columns = [
        { name: 'representante_legal', type: 'TEXT' },
        { name: 'tipo_identificacion', type: 'TEXT' },
        { name: 'departamento', type: 'TEXT' },
        { name: 'ciudad', type: 'TEXT' },
        { name: 'telefono2', type: 'TEXT' },
        { name: 'correo_electronico', type: 'TEXT' },
        { name: 'responsabilidad_tributaria', type: 'TEXT' },
        { name: 'tributos', type: 'TEXT' }, // JSON
        { name: 'zona', type: 'TEXT' },
        { name: 'sitio_web', type: 'TEXT' },
        { name: 'alias', type: 'TEXT' },
        { name: 'actividad_economica', type: 'TEXT' },
        { name: 'descripcion', type: 'TEXT' },
        { name: 'logo', type: 'TEXT' } // path or base64
      ];

      for (const col of columns) {
        db.run(`ALTER TABLE config_facturacion ADD COLUMN ${col.name} ${col.type}`, (err) => {
          if (err && (err as any).message.includes('duplicate column name')) {
            console.log(`ℹ️ La columna ${col.name} ya existe.`);
          } else if (err) {
            console.error(`❌ Error añadiendo columna ${col.name}:`, err);
          } else {
            console.log(`✅ Columna ${col.name} añadida exitosamente.`);
          }
        });
      }
    });

    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Migración de empresa extendida completada');
        resolve();
      }
    });
  });
}

if (require.main === module) {
  ejecutarMigracionEmpresaExt()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
