import express, { Request, Response } from 'express';
import { db } from '../database/database';
import { verificarAutenticacion as verifyToken, verificarPermiso as checkPermission } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * GET /api/empleados
 * Listar todos los empleados
 */
router.get('/', verifyToken, checkPermission('nomina.gestion'), async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const rows = await db.selectFrom('empleados')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .orderBy('apellidos', 'asc')
      .orderBy('nombres', 'asc')
      .execute();
    res.json(rows);
  } catch (error: any) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({ error: 'Error al obtener empleados', details: error.message });
  }
});

/**
 * GET /api/empleados/activos
 * Listar solo empleados activos
 */
router.get('/activos', verifyToken, checkPermission('nomina.gestion'), async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const rows = await db.selectFrom('empleados')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .where('estado', '=', 'ACTIVO')
      .orderBy('apellidos', 'asc')
      .orderBy('nombres', 'asc')
      .execute();
    res.json(rows);
  } catch (error: any) {
    console.error('Error al obtener empleados activos:', error);
    res.status(500).json({ error: 'Error al obtener empleados activos', details: error.message });
  }
});

/**
 * GET /api/empleados/:id
 * Obtener un empleado por ID
 */
router.get('/:id', verifyToken, checkPermission('nomina.gestion'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const row = await db.selectFrom('empleados')
      .selectAll()
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
    
    if (!row) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json(row);
  } catch (error: any) {
    console.error('Error al obtener empleado:', error);
    res.status(500).json({ error: 'Error al obtener empleado', details: error.message });
  }
});

/**
 * POST /api/empleados
 * Crear nuevo empleado
 */
router.post('/', verifyToken, checkPermission('nomina.gestion'), async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const empleado = req.body;
    
    const result = await db.insertInto('empleados')
      .values({
        empresa_id: empresaId,
        tipo_documento: empleado.tipo_documento,
        numero_documento: empleado.numero_documento,
        nombres: empleado.nombres,
        apellidos: empleado.apellidos,
        direccion: empleado.direccion,
        municipio: empleado.municipio,
        celular: empleado.celular,
        email: empleado.email,
        cargo: empleado.cargo,
        tipo_contrato: empleado.tipo_contrato,
        fecha_inicio: empleado.fecha_inicio ? new Date(empleado.fecha_inicio) : null,
        fecha_fin: empleado.fecha_fin ? new Date(empleado.fecha_fin) : null,
        tipo_trabajador: empleado.tipo_trabajador || 'DEPENDIENTE',
        subtipo_trabajador: empleado.subtipo_trabajador,
        alto_riesgo: !!empleado.alto_riesgo,
        salario_integral: !!empleado.salario_integral,
        frecuencia_pago: empleado.frecuencia_pago || 'MENSUAL',
        salario_base: empleado.salario_base,
        auxilio_transporte: empleado.auxilio_transporte !== false,
        metodo_pago: empleado.metodo_pago,
        banco: empleado.banco,
        tipo_cuenta: empleado.tipo_cuenta,
        numero_cuenta: empleado.numero_cuenta,
        estado: empleado.estado || 'ACTIVO'
      })
      .returningAll()
      .executeTakeFirst();

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error al crear empleado:', error);
    if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate key value')) {
      return res.status(400).json({ error: 'El número de documento ya está registrado para esta empresa' });
    }
    res.status(500).json({ error: 'Error al crear empleado', details: error.message });
  }
});

/**
 * PUT /api/empleados/:id
 * Actualizar empleado
 */
router.put('/:id', verifyToken, checkPermission('nomina.gestion'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const empleado = req.body;
    
    const result = await db.updateTable('empleados')
      .set({
        tipo_documento: empleado.tipo_documento,
        numero_documento: empleado.numero_documento,
        nombres: empleado.nombres,
        apellidos: empleado.apellidos,
        direccion: empleado.direccion,
        municipio: empleado.municipio,
        celular: empleado.celular,
        email: empleado.email,
        cargo: empleado.cargo,
        tipo_contrato: empleado.tipo_contrato,
        fecha_inicio: empleado.fecha_inicio ? new Date(empleado.fecha_inicio) : null,
        fecha_fin: empleado.fecha_fin ? new Date(empleado.fecha_fin) : null,
        tipo_trabajador: empleado.tipo_trabajador,
        subtipo_trabajador: empleado.subtipo_trabajador,
        alto_riesgo: !!empleado.alto_riesgo,
        salario_integral: !!empleado.salario_integral,
        frecuencia_pago: empleado.frecuencia_pago,
        salario_base: empleado.salario_base,
        auxilio_transporte: empleado.auxilio_transporte !== false,
        metodo_pago: empleado.metodo_pago,
        banco: empleado.banco,
        tipo_cuenta: empleado.tipo_cuenta,
        numero_cuenta: empleado.numero_cuenta,
        estado: empleado.estado,
        updated_at: new Date() as any
      })
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .returningAll()
      .executeTakeFirst();

    if (!result) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Error al actualizar empleado:', error);
    if (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate key value')) {
      return res.status(400).json({ error: 'El número de documento ya está registrado para esta empresa' });
    }
    res.status(500).json({ error: 'Error al actualizar empleado', details: error.message });
  }
});

/**
 * DELETE /api/empleados/:id
 * Eliminar (dar de baja) un empleado
 */
router.delete('/:id', verifyToken, checkPermission('nomina.gestion'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    
    const result = await db.deleteFrom('empleados')
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();
    
    if (Number(result.numDeletedRows) === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({ error: 'Error al eliminar empleado', details: error.message });
  }
});

export default router;

