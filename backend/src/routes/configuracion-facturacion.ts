import { Router, Request, Response } from 'express';
import { db } from '../database/init';

const router = Router();

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
  db.get(
    'SELECT * FROM config_facturacion ORDER BY id DESC LIMIT 1',
    [],
    (err, row: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
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
        representante_legal: row.representante_legal,
        tipo_identificacion: row.tipo_identificacion,
        departamento: row.departamento,
        ciudad: row.ciudad,
        telefono2: row.telefono2,
        correo_electronico: row.correo_electronico,
        responsabilidad_tributaria: row.responsabilidad_tributaria,
        tributos: row.tributos ? JSON.parse(row.tributos) : [],
        zona: row.zona,
        sitio_web: row.sitio_web,
        alias: row.alias,
        actividad_economica: row.actividad_economica,
        descripcion: row.descripcion,
        logo: row.logo,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      res.json(config);
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
    telefonos,
    representante_legal,
    tipo_identificacion,
    departamento,
    ciudad,
    telefono2,
    correo_electronico,
    responsabilidad_tributaria,
    tributos,
    zona,
    sitio_web,
    alias,
    actividad_economica,
    descripcion,
    logo
  } = req.body;

  // Validaciones
  if (!nombre_empresa || !nit || !direccion || !telefonos) {
    res.status(400).json({ 
      error: 'Faltan campos requeridos: nombre_empresa, nit, direccion, telefonos' 
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

  // Verificar si existe configuración
  db.get('SELECT id FROM config_facturacion LIMIT 1', [], (err, row: any) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const telefonosJSON = JSON.stringify(telefonos);
    const tributosJSON = tributos ? JSON.stringify(tributos) : '[]';
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
             representante_legal = ?,
             tipo_identificacion = ?,
             departamento = ?,
             ciudad = ?,
             telefono2 = ?,
             correo_electronico = ?,
             responsabilidad_tributaria = ?,
             tributos = ?,
             zona = ?,
             sitio_web = ?,
             alias = ?,
             actividad_economica = ?,
             descripcion = ?,
             logo = ?,
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
          representante_legal,
          tipo_identificacion,
          departamento,
          ciudad,
          telefono2,
          correo_electronico,
          responsabilidad_tributaria,
          tributosJSON,
          zona,
          sitio_web,
          alias,
          actividad_economica,
          descripcion,
          logo,
          row.id
        ],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          // Obtener configuración actualizada
          db.get(
            'SELECT * FROM config_facturacion WHERE id = ?',
            [row.id],
            (err, updatedRow: any) => {
              if (err) {
                res.status(500).json({ error: err.message });
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
                representante_legal: updatedRow.representante_legal,
                tipo_identificacion: updatedRow.tipo_identificacion,
                departamento: updatedRow.departamento,
                ciudad: updatedRow.ciudad,
                telefono2: updatedRow.telefono2,
                correo_electronico: updatedRow.correo_electronico,
                responsabilidad_tributaria: updatedRow.responsabilidad_tributaria,
                tributos: updatedRow.tributos ? JSON.parse(updatedRow.tributos) : [],
                zona: updatedRow.zona,
                sitio_web: updatedRow.sitio_web,
                alias: updatedRow.alias,
                actividad_economica: updatedRow.actividad_economica,
                descripcion: updatedRow.descripcion,
                logo: updatedRow.logo,
                created_at: updatedRow.created_at,
                updated_at: updatedRow.updated_at
              };

              res.json(config);
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
          telefonos,
          representante_legal,
          tipo_identificacion,
          departamento,
          ciudad,
          telefono2,
          correo_electronico,
          responsabilidad_tributaria,
          tributos,
          zona,
          sitio_web,
          alias,
          actividad_economica,
          descripcion,
          logo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nombre_empresa,
          nit,
          responsableIvaInt,
          porcentajeIvaValue,
          direccion,
          ubicacion_geografica,
          telefonosJSON,
          representante_legal,
          tipo_identificacion,
          departamento,
          ciudad,
          telefono2,
          correo_electronico,
          responsabilidad_tributaria,
          tributosJSON,
          zona,
          sitio_web,
          alias,
          actividad_economica,
          descripcion,
          logo
        ],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          // Obtener configuración recién creada
          db.get(
            'SELECT * FROM config_facturacion WHERE id = ?',
            [this.lastID],
            (err, newRow: any) => {
              if (err) {
                res.status(500).json({ error: err.message });
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
                representante_legal: newRow.representante_legal,
                tipo_identificacion: newRow.tipo_identificacion,
                departamento: newRow.departamento,
                ciudad: newRow.ciudad,
                telefono2: newRow.telefono2,
                correo_electronico: newRow.correo_electronico,
                responsabilidad_tributaria: newRow.responsabilidad_tributaria,
                tributos: newRow.tributos ? JSON.parse(newRow.tributos) : [],
                zona: newRow.zona,
                sitio_web: newRow.sitio_web,
                alias: newRow.alias,
                actividad_economica: newRow.actividad_economica,
                descripcion: newRow.descripcion,
                logo: newRow.logo,
                created_at: newRow.created_at,
                updated_at: newRow.updated_at
              };

              res.status(201).json(config);
            }
          );
        }
      );
    }
  });
});

export default router;
