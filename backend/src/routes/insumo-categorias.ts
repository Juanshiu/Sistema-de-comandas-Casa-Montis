import { Router, Request, Response } from 'express';
import { db } from '../database/database';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = Router();

router.use(verificarAutenticacion);

// Listar categorías de insumos
router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const categorias = await db.selectFrom('insumo_categorias')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .orderBy('nombre', 'asc')
      .execute();
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al listar categorías de insumos', details: error.message });
  }
});

// Crear categoría de insumo
router.post('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    await db.insertInto('insumo_categorias')
      .values({
        empresa_id: empresaId,
        nombre,
        descripcion,
        activo: true
      })
      .execute();
    res.status(201).json({ message: 'Categoría creada correctamente' });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key value')) {
      return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear categoría', details: error.message });
  }
});

// Actualizar categoría de insumo
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const result = await db.updateTable('insumo_categorias')
      .set({
        nombre,
        descripcion,
        updated_at: new Date() as any
      })
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría actualizada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar categoría', details: error.message });
  }
});

// Eliminar categoría (desactivar)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;

    // Verificar si hay insumos usando esta categoría
    const insumosExistentes = await db.selectFrom('insumos')
      .select('id')
      .where('categoria_id', '=', id)
      .where('empresa_id', '=', empresaId)
      .where('activo', '=', true)
      .executeTakeFirst();

    if (insumosExistentes) {
      return res.status(400).json({ error: 'No se puede eliminar la categoría porque hay insumos asociados a ella' });
    }

    const result = await db.updateTable('insumo_categorias')
      .set({ activo: false, updated_at: new Date() as any })
      .where('id', '=', id)
      .where('empresa_id', '=', empresaId)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar categoría', details: error.message });
  }
});

export default router;

