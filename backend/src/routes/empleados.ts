import express from 'express';
import { db } from '../database/init';
import { verificarAutenticacion as verifyToken, verificarPermiso as checkPermission } from '../middleware/authMiddleware';
import { Empleado } from '../models';

const router = express.Router();

/**
 * GET /api/empleados
 * Listar todos los empleados
 */
router.get('/', verifyToken, checkPermission('nomina.gestion'), (req, res) => {
  const sql = `SELECT * FROM empleados ORDER BY apellidos, nombres`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener empleados:', err);
      return res.status(500).json({ error: 'Error al obtener empleados' });
    }
    res.json(rows);
  });
});

/**
 * GET /api/empleados/activos
 * Listar solo empleados activos
 */
router.get('/activos', verifyToken, checkPermission('nomina.gestion'), (req, res) => {
  const sql = `SELECT * FROM empleados WHERE estado = 'ACTIVO' ORDER BY apellidos, nombres`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener empleados activos:', err);
      return res.status(500).json({ error: 'Error al obtener empleados activos' });
    }
    res.json(rows);
  });
});

/**
 * GET /api/empleados/:id
 * Obtener un empleado por ID
 */
router.get('/:id', verifyToken, checkPermission('nomina.gestion'), (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM empleados WHERE id = ?`;
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error al obtener empleado:', err);
      return res.status(500).json({ error: 'Error al obtener empleado' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json(row);
  });
});

/**
 * POST /api/empleados
 * Crear nuevo empleado
 */
router.post('/', verifyToken, checkPermission('nomina.gestion'), (req, res) => {
  const empleado = req.body as Partial<Empleado>;
  
  const sql = `
    INSERT INTO empleados (
      tipo_documento, numero_documento, nombres, apellidos, direccion, municipio, celular, email,
      cargo, tipo_contrato, fecha_inicio, fecha_fin,
      tipo_trabajador, subtipo_trabajador, alto_riesgo, salario_integral,
      frecuencia_pago, salario_base, auxilio_transporte,
      metodo_pago, banco, tipo_cuenta, numero_cuenta,
      estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const params = [
    empleado.tipo_documento, empleado.numero_documento, empleado.nombres, empleado.apellidos, empleado.direccion, empleado.municipio, empleado.celular, empleado.email,
    empleado.cargo, empleado.tipo_contrato, empleado.fecha_inicio, empleado.fecha_fin,
    empleado.tipo_trabajador || 'DEPENDIENTE', empleado.subtipo_trabajador, empleado.alto_riesgo ? 1 : 0, empleado.salario_integral ? 1 : 0,
    empleado.frecuencia_pago || 'MENSUAL', empleado.salario_base, empleado.auxilio_transporte !== false ? 1 : 0,
    empleado.metodo_pago, empleado.banco, empleado.tipo_cuenta, empleado.numero_cuenta,
    empleado.estado || 'ACTIVO'
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error al crear empleado:', err);
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'El número de documento ya está registrado' });
      }
      return res.status(500).json({ error: 'Error al crear empleado' });
    }
    
    // Devolver el empleado creado
    db.get(`SELECT * FROM empleados WHERE id = ?`, [this.lastID], (err, row) => {
      if (err) return res.status(201).json({ id: this.lastID, ...empleado });
      res.status(201).json(row);
    });
  });
});

/**
 * PUT /api/empleados/:id
 * Actualizar empleado
 */
router.put('/:id', verifyToken, checkPermission('nomina.gestion'), (req, res) => {
  const { id } = req.params;
  const empleado = req.body as Partial<Empleado>;
  
  const sql = `
    UPDATE empleados SET
      tipo_documento = ?, numero_documento = ?, nombres = ?, apellidos = ?, direccion = ?, municipio = ?, celular = ?, email = ?,
      cargo = ?, tipo_contrato = ?, fecha_inicio = ?, fecha_fin = ?,
      tipo_trabajador = ?, subtipo_trabajador = ?, alto_riesgo = ?, salario_integral = ?,
      frecuencia_pago = ?, salario_base = ?, auxilio_transporte = ?,
      metodo_pago = ?, banco = ?, tipo_cuenta = ?, numero_cuenta = ?,
      estado = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  const params = [
    empleado.tipo_documento, empleado.numero_documento, empleado.nombres, empleado.apellidos, empleado.direccion, empleado.municipio, empleado.celular, empleado.email,
    empleado.cargo, empleado.tipo_contrato, empleado.fecha_inicio, empleado.fecha_fin,
    empleado.tipo_trabajador, empleado.subtipo_trabajador, empleado.alto_riesgo ? 1 : 0, empleado.salario_integral ? 1 : 0,
    empleado.frecuencia_pago, empleado.salario_base, empleado.auxilio_transporte !== false ? 1 : 0,
    empleado.metodo_pago, empleado.banco, empleado.tipo_cuenta, empleado.numero_cuenta,
    empleado.estado,
    id
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error al actualizar empleado:', err);
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'El número de documento ya está registrado' });
      }
      return res.status(500).json({ error: 'Error al actualizar empleado' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    // Devolver el empleado actualizado
    db.get(`SELECT * FROM empleados WHERE id = ?`, [id], (err, row) => {
      if (err) return res.json({ id, ...empleado });
      res.json(row);
    });
  });
});

/**
 * DELETE /api/empleados/:id
 * Eliminar (dar de baja) un empleado
 */
router.delete('/:id', verifyToken, checkPermission('nomina.gestion'), (req, res) => {
  const { id } = req.params;
  
  // Podríamos hacer un borrado lógico (cambiar estado a INACTIVO) o físico.
  // El usuario pidió "eliminar", así que haremos borrado físico para limpiar la lista.
  // Pero lo más seguro en nómina es borrado lógico si ya tiene registros asociados.
  // Sin embargo, para cumplir con el pedido directo de "eliminar":
  const sql = `DELETE FROM empleados WHERE id = ?`;
  
  db.run(sql, [id], function(err) {
    if (err) {
      console.error('Error al eliminar empleado:', err);
      return res.status(500).json({ error: 'Error al eliminar empleado' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    res.json({ message: 'Empleado eliminado correctamente' });
  });
});

export default router;
