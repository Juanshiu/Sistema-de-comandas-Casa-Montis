/// <reference path="../types/express.d.ts" />
import express, { Request, Response } from 'express';
import { MesaService } from '../services/mesaService';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = express.Router();
const mesaService = new MesaService();

router.use(verificarAutenticacion);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const mesas = await mesaService.listarMesas(empresaId);
    res.json(mesas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const mesa = await mesaService.obtenerMesa(id, empresaId);
    res.json(mesa);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const nueva = await mesaService.crearMesa(empresaId, req.body);
    res.status(201).json(nueva);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const actualizada = await mesaService.actualizarMesa(id, empresaId, req.body);
    res.json(actualizada);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Alias for patch/put interoperability (frontend sometimes uses patch)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const actualizada = await mesaService.actualizarMesa(id, empresaId, req.body);
    res.json(actualizada);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const deleted = await mesaService.eliminarMesa(id, empresaId);
    if (!deleted) return res.status(404).json({ error: 'No se pudo eliminar' });
    res.json({ message: 'Mesa eliminada' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
