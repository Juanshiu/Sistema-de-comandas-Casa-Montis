import { Router, Request, Response } from 'express';
import { db } from '../database/init';

const router = Router();

const runAsync = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

const getAsync = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
};

const allAsync = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
};

// Listar proveedores
router.get('/', async (req: Request, res: Response) => {
  try {
    const proveedores = await allAsync('SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre ASC');
    res.json(proveedores);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar proveedores', details: error.message });
  }
});

// Crear proveedor
router.post('/', async (req: Request, res: Response) => {
  try {
    const { 
      nombre, documento, telefono, correo, direccion, descripcion, pais, departamento, ciudad,
      banco_nombre, banco_tipo_cuenta, banco_titular, banco_nit_titular, banco_numero_cuenta 
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    await runAsync(
      `INSERT INTO proveedores (
        nombre, documento, telefono, correo, direccion, descripcion, pais, departamento, ciudad,
        banco_nombre, banco_tipo_cuenta, banco_titular, banco_nit_titular, banco_numero_cuenta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [
        nombre, documento, telefono, correo, direccion, descripcion, pais, departamento, ciudad,
        banco_nombre, banco_tipo_cuenta, banco_titular, banco_nit_titular, banco_numero_cuenta
      ]
    );

    res.status(201).json({ message: 'Proveedor creado correctamente' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed: proveedores.documento')) {
      return res.status(400).json({ error: 'Ya existe un proveedor con este documento' });
    }
    res.status(500).json({ error: 'Error al crear proveedor', details: error.message });
  }
});

// Actualizar proveedor
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      nombre, documento, telefono, correo, direccion, descripcion, pais, departamento, ciudad,
      banco_nombre, banco_tipo_cuenta, banco_titular, banco_nit_titular, banco_numero_cuenta 
    } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    await runAsync(
      `UPDATE proveedores SET 
        nombre = ?, documento = ?, telefono = ?, correo = ?, direccion = ?, descripcion = ?, pais = ?, departamento = ?, ciudad = ?,
        banco_nombre = ?, banco_tipo_cuenta = ?, banco_titular = ?, banco_nit_titular = ?, banco_numero_cuenta = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
      , [
        nombre, documento, telefono, correo, direccion, descripcion, pais, departamento, ciudad,
        banco_nombre, banco_tipo_cuenta, banco_titular, banco_nit_titular, banco_numero_cuenta,
        id
      ]
    );

    res.json({ message: 'Proveedor actualizado correctamente' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed: proveedores.documento')) {
      return res.status(400).json({ error: 'Ya existe un proveedor con este documento' });
    }
    res.status(500).json({ error: 'Error al actualizar proveedor', details: error.message });
  }
});

// Eliminar proveedor (desactivar)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await runAsync('UPDATE proveedores SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar proveedor', details: error.message });
  }
});

export default router;
