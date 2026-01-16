import { Router, Request, Response } from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';

const router = Router();
const dbPath = path.join(__dirname, '../../database/restaurante.db');

interface ConfiguracionFacturacion {
  id?: number;
  nombre_empresa: string;
  nit: string;
  responsable_iva: boolean;
  porcentaje_iva: number | null;
  direccion: string;
  ubicacion_geografica: string;
  telefonos: string[];
  
  // Nuevos campos extendidos
  representante_legal?: string;
  tipo_identificacion?: string;
  departamento?: string;
  ciudad?: string;
  telefono2?: string;
  correo_electronico?: string;
  responsabilidad_tributaria?: string;
  tributos?: string[]; // Array de strings (interés dinámico)
  zona?: string;
  sitio_web?: string;
  alias?: string;
  actividad_economica?: string;
  descripcion?: string;
  logo?: string;

  created_at?: string;
  updated_at?: string;
}

// GET - Obtener configuración de facturación
router.get('/', async (req: Request, res: Response) => {
  const db = new sqlite3.Database(dbPath);

  db.get(
    'SELECT * FROM config_facturacion ORDER BY id DESC LIMIT 1',
    [],
    (err, row: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        db.close();
        return;
      }

      if (!row) {
        // Si no hay configuración, devolver valores por defecto
        const defaultConfig: ConfiguracionFacturacion = {
          nombre_empresa: 'CASA MONTIS RESTAURANTE',
          nit: '26420708-2',
          responsable_iva: false,
          porcentaje_iva: null,
          direccion: 'CRA 9 # 11 07 - EDUARDO SANTOS',
          ubicacion_geografica: 'PALERMO - HUILA',
          telefonos: ['3132171025', '3224588520']
        };
        res.json(defaultConfig);
        db.close();
        return;
      }

      // Convertir responsable_iva de INTEGER a BOOLEAN
      // Parsear telefonos de JSON string a array
      const config: ConfiguracionFacturacion = {
        id: row.id,
        nombre_empresa: row.nombre_empresa,
        nit: row.nit,
        responsable_iva: row.responsable_iva === 1,
        porcentaje_iva: row.porcentaje_iva,
        direccion: row.direccion,
        ubicacion_geografica: row.ubicacion_geografica,
        telefonos: JSON.parse(row.telefonos),
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      res.json(config);
      db.close();
    }
  );
});

// PUT - Actualizar configuración de facturación
router.put('/', async (req: Request, res: Response) => {
  const {
    nombre_empresa,
    nit,
    responsable_iva,
    porcentaje_iva,
    direccion,
    ubicacion_geografica,
    telefonos
  } = req.body;

  // Validaciones
  if (!nombre_empresa || !nit || !direccion || !ubicacion_geografica || !telefonos) {
    res.status(400).json({ 
      error: 'Faltan campos requeridos: nombre_empresa, nit, direccion, ubicacion_geografica, telefonos' 
    });
    return;
  }

  if (!Array.isArray(telefonos) || telefonos.length === 0) {
    res.status(400).json({ error: 'telefonos debe ser un array con al menos un teléfono' });
    return;
  }

  if (responsable_iva && (!porcentaje_iva || porcentaje_iva <= 0 || porcentaje_iva > 100)) {
    res.status(400).json({ 
      error: 'Si es responsable de IVA, debe proporcionar un porcentaje válido (1-100)' 
    });
    return;
  }

  const db = new sqlite3.Database(dbPath);

  // Verificar si existe configuración
  db.get('SELECT id FROM config_facturacion LIMIT 1', [], (err, row: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      db.close();
      return;
    }

    const telefonosJSON = JSON.stringify(telefonos);
    const responsableIvaInt = responsable_iva ? 1 : 0;
    const porcentajeIvaValue = responsable_iva ? porcentaje_iva : null;

    if (row) {
      // UPDATE - Actualizar configuración existente
      db.run(
        `UPDATE config_facturacion 
         SET nombre_empresa = ?,
             nit = ?,
             responsable_iva = ?,
             porcentaje_iva = ?,
             direccion = ?,
             ubicacion_geografica = ?,
             telefonos = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          nombre_empresa,
          nit,
          responsableIvaInt,
          porcentajeIvaValue,
          direccion,
          ubicacion_geografica,
          telefonosJSON,
          row.id
        ],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
          }

          // Obtener configuración actualizada
          db.get(
            'SELECT * FROM config_facturacion WHERE id = ?',
            [row.id],
            (err, updatedRow: any) => {
              if (err) {
                res.status(500).json({ error: err.message });
                db.close();
                return;
              }

              const config: ConfiguracionFacturacion = {
                id: updatedRow.id,
                nombre_empresa: updatedRow.nombre_empresa,
                nit: updatedRow.nit,
                responsable_iva: updatedRow.responsable_iva === 1,
                porcentaje_iva: updatedRow.porcentaje_iva,
                direccion: updatedRow.direccion,
                ubicacion_geografica: updatedRow.ubicacion_geografica,
                telefonos: JSON.parse(updatedRow.telefonos),
                created_at: updatedRow.created_at,
                updated_at: updatedRow.updated_at
              };

              res.json(config);
              db.close();
            }
          );
        }
      );
    } else {
      // INSERT - Crear nueva configuración
      db.run(
        `INSERT INTO config_facturacion (
          nombre_empresa,
          nit,
          responsable_iva,
          porcentaje_iva,
          direccion,
          ubicacion_geografica,
          telefonos
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre_empresa,
          nit,
          responsableIvaInt,
          porcentajeIvaValue,
          direccion,
          ubicacion_geografica,
          telefonosJSON
        ],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            db.close();
            return;
          }

          // Obtener configuración recién creada
          db.get(
            'SELECT * FROM config_facturacion WHERE id = ?',
            [this.lastID],
            (err, newRow: any) => {
              if (err) {
                res.status(500).json({ error: err.message });
                db.close();
                return;
              }

              const config: ConfiguracionFacturacion = {
                id: newRow.id,
                nombre_empresa: newRow.nombre_empresa,
                nit: newRow.nit,
                responsable_iva: newRow.responsable_iva === 1,
                porcentaje_iva: newRow.porcentaje_iva,
                direccion: newRow.direccion,
                ubicacion_geografica: newRow.ubicacion_geografica,
                telefonos: JSON.parse(newRow.telefonos),
                created_at: newRow.created_at,
                updated_at: newRow.updated_at
              };

              res.status(201).json(config);
              db.close();
            }
          );
        }
      );
    }
  });
});

export default router;
