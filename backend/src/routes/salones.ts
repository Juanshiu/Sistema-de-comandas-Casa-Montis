import express, { Request, Response } from 'express';
import { SalonService } from '../services/salonService';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = express.Router();
const salonService = new SalonService();

router.use(verificarAutenticacion);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const salones = await salonService.listarSalones(empresaId);
    res.json(salones);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const salon = await salonService.obtenerSalon(id, empresaId);
    res.json(salon);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { empresaId } = req.context;
    const nuevo = await salonService.crearSalon(empresaId, req.body);
    res.status(201).json(nuevo);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const actualizado = await salonService.actualizarSalon(id, empresaId, req.body);
    res.json(actualizado);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresaId } = req.context;
    const deleted = await salonService.eliminarSalon(id, empresaId);
    if (!deleted) return res.status(404).json({ error: 'No se pudo eliminar' });
    res.json({ message: 'Salón eliminado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
