import express, { Request, Response } from 'express';
import { CategoriaService } from '../services/categoriaService';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = express.Router();
const categoriaService = new CategoriaService();

router.use(verificarAutenticacion);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const categorias = await categoriaService.listarCategorias(empresaId);
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener solo las categorías activas (debe estar ANTES de /:id)
router.get('/activas', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const categorias = await categoriaService.listarCategorias(empresaId, true);
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const categoria = await categoriaService.obtenerCategoria(id, empresaId);
    res.json(categoria);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const nueva = await categoriaService.crearCategoria(empresaId, req.body);
    res.status(201).json(nueva);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const actualizada = await categoriaService.actualizarCategoria(id, empresaId, req.body);
    res.json(actualizada);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const deleted = await categoriaService.eliminarCategoria(id, empresaId);
    if (!deleted) return res.status(404).json({ error: 'No se pudo eliminar' });
    res.json({ message: 'Eliminada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
