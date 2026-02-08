import { Router, Request, Response } from 'express';
import { db } from '../database/database';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = Router();

router.use(verificarAutenticacion);

// Listar proveedores
router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const proveedores = await db.selectFrom('proveedores')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .orderBy('nombre', 'asc')
      .execute();
    res.json(proveedores);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar proveedores', details: error.message });
  }
});

// Crear proveedor
router.post('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { 
      nombre, documento, telefono, correo, direccion, descripcion, pais, departamento, ciudad,
      banco_nombre, banco_tipo_cuenta, banco_titular, banco_nit_titular, banco_numero_cuenta 
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    await db.insertInto('proveedores')
      .values({
        empresa_id: empresaId,
        nombre,
        documento,
        telefono,
        correo,
        direccion,
        descripcion,
        pais,
        departamento,
        ciudad,
        banco_nombre,
        banco_tipo_cuenta,
        banco_titular,
        banco_nit_titular,
        banco_numero_cuenta,
        activo: true
      })
      .execute();

    res.status(201).json({ message: 'Proveedor creado correctamente' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key value')) {
      return res.status(400).json({ error: 'Ya existe un proveedor con este documento' });
    }
    res.status(500).json({ error: 'Error al crear proveedor', details: error.message });
  }
});

// Actualizar proveedor
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const { 
      nombre, documento, telefono, correo, direccion, descripcion, pais, departamento, ciudad,
      banco_nombre, banco_tipo_cuenta, banco_titular, banco_nit_titular, banco_numero_cuenta 
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const result = await db.updateTable('proveedores')
      .set({
        nombre,
        documento,
        telefono,
        correo,
        direccion,
        descripcion,
        pais,
        departamento,
        ciudad,
        banco_nombre,
        banco_tipo_cuenta,
        banco_titular,
        banco_nit_titular,
        banco_numero_cuenta,
        updated_at: new Date() as any
      })
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json({ message: 'Proveedor actualizado correctamente' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key value')) {
      return res.status(400).json({ error: 'Ya existe un proveedor con este documento' });
    }
    res.status(500).json({ error: 'Error al actualizar proveedor', details: error.message });
  }
});

// Eliminar proveedor (desactivar)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    
    const result = await db.updateTable('proveedores')
      .set({ activo: false, updated_at: new Date() as any })
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar proveedor', details: error.message });
  }
});

export default router;

