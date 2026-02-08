/// <reference path="../types/express.d.ts" />
import express, { Request, Response } from 'express';
import { ProductoService } from '../services/productoService';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = express.Router();
const productoService = new ProductoService();

router.use(verificarAutenticacion);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    // Query param to filter only active/available
    const soloDisponibles = req.query.disponible === 'true';
    const productos = await productoService.listarProductos(empresaId, soloDisponibles);
    res.json(productos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/all', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    // El frontend espera todos los productos, posiblemente para carga inicial
    const productos = await productoService.listarProductos(empresaId, false);
    res.json(productos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categoria/:categoriaId', async (req: Request, res: Response) => {
  try {
    const { categoriaId } = req.params;
    const { empresaId } = req.context;
    const productos = await productoService.listarPorCategoria(categoriaId, empresaId);
    res.json(productos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener los nombres de categorías (usado por SeleccionTipoServicio)
router.get('/categorias', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const productos = await productoService.listarProductos(empresaId, true);
    // Extraer categorías únicas de los productos disponibles
    const categorias = [...new Set(productos
      .map((p: any) => p.categoria)
      .filter((c: string | null) => c !== null && c !== undefined)
    )];
    res.json(categorias);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const producto = await productoService.obtenerProducto(id, empresaId);
    res.json(producto);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const nuevo = await productoService.crearProducto(empresaId, req.body);
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const actualizado = await productoService.actualizarProducto(id, empresaId, req.body);
    res.json(actualizado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const deleted = await productoService.eliminarProducto(id, empresaId);
    if (!deleted) return res.status(404).json({ error: 'No se pudo eliminar o no existe' });
    res.json({ message: 'Producto eliminado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
