import { Router, Request, Response } from 'express';
import { db } from '../database/init';

const router = Router();

// Helpers para base de datos
const runAsync = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

const allAsync = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Listar categorías de insumos
router.get('/', async (req: Request, res: Response) => {
  try {
    const categorias = await allAsync('SELECT * FROM insumo_categorias WHERE activo = 1 ORDER BY nombre ASC');
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar categorías de insumos', details: error.message });
  }
});

// Crear categoría de insumo
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    await runAsync(
      'INSERT INTO insumo_categorias (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion]
    );
    res.status(201).json({ message: 'Categoría creada correctamente' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear categoría', details: error.message });
  }
});

// Actualizar categoría de insumo
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    await runAsync(
      'UPDATE insumo_categorias SET nombre = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nombre, descripcion, id]
    );
    res.json({ message: 'Categoría actualizada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar categoría', details: error.message });
  }
});

// Eliminar categoría (desactivar)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Verificar si hay insumos usando esta categoría
    const insumosExistentes = await allAsync('SELECT id FROM insumos WHERE categoria_id = ? AND activo = 1', [id]);
    if (insumosExistentes.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar la categoría porque hay insumos asociados a ella' });
    }

    await runAsync('UPDATE insumo_categorias SET activo = 0 WHERE id = ?', [id]);
    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar categoría', details: error.message });
  }
});

export default router;
