/// <reference path="../types/express.d.ts" />
import { Router, Request, Response } from 'express';
import { verificarAutenticacion } from '../middleware/authMiddleware';
import { ComandaService } from '../services/comandaService';

const router = Router();
const comandaService = new ComandaService();

// Create Comanda
router.post('/', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId, userId } = req.context;
        const datos = req.body;
        
        // Basic validation
        if (!datos.items || !Array.isArray(datos.items) || datos.items.length === 0) {
            res.status(400).json({ error: 'La comanda debe tener items' });
            return;
        }

        const result = await comandaService.crearComanda(empresaId, userId, datos);
        res.status(201).json(result);
    } catch (error: any) {
        console.error('Error creando comanda:', error);
        if (error.code === 'INSUMO_INSUFICIENTE' || error.code === 'PRODUCTO_INSUFICIENTE' || error.code === 'PERSONALIZACION_INSUFICIENTE') {
            res.status(409).json({ error: error }); // 409 Conflict for inventory issues
        } else {
            res.status(500).json({ error: error.message || 'Error interno al crear comanda' });
        }
    }
});

// List Active Comandas
router.get('/activas', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const comandas = await comandaService.getComandasActivas(empresaId);
        res.json(comandas);
    } catch (error: any) {
        console.error('Error obteniendo comandas activas:', error);
        res.status(500).json({ error: 'Error al obtener comandas' });
    }
});

// Historial de Comandas (cerradas)
router.get('/historial', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { desde, hasta, estado, page, limit } = req.query;
        
        const pageNum = parseInt(page as string) || 1;
        const limitNum = parseInt(limit as string) || 20;
        
        const historial = await comandaService.getHistorialComandas(empresaId, {
            desde: desde as string,
            hasta: hasta as string,
            estado: estado as string,
            limite: limitNum + 1 // Fetch one extra to check if there's more
        });
        
        const hasMore = historial.length > limitNum;
        const data = hasMore ? historial.slice(0, limitNum) : historial;
        
        // Retornar formato paginado esperado por el frontend
        res.json({
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: data.length, // Aproximado sin count real
                totalPages: hasMore ? pageNum + 1 : pageNum
            }
        });
    } catch (error: any) {
        console.error('Error obteniendo historial de comandas:', error);
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

// Get Comanda Detail
router.get('/:id', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { id } = req.params;
        const comanda = await comandaService.getDetalleComanda(id, empresaId);
        
        if (!comanda) {
            res.status(404).json({ error: 'Comanda no encontrada' });
            return;
        }
        
        res.json(comanda);
    } catch (error: any) {
        console.error('Error obteniendo detalle comanda:', error);
        res.status(500).json({ error: 'Error al obtener detalle' });
    }
});

// Change Status
router.patch('/:id/estado', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { id } = req.params;
        const { estado } = req.body;
        
        if (!estado) {
            res.status(400).json({ error: 'Estado requerido' });
            return;
        }

        const success = await comandaService.cambiarEstado(id, empresaId, estado);
        if (!success) {
            res.status(404).json({ error: 'Comanda no encontrada o no actualizada' });
            return;
        }
        
        res.json({ success: true, estado });
    } catch (error: any) {
        console.error('Error cambiando estado:', error);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
});

router.put('/:id', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId, userId } = req.context;
        const { id } = req.params;
        const datos = req.body;

        if (!datos.items || !Array.isArray(datos.items) || datos.items.length === 0) {
            res.status(400).json({ error: 'La comanda debe tener items' });
            return;
        }

        const result = await comandaService.editarComanda(id, empresaId, userId, datos);
        res.json(result);
    } catch (error: any) {
        console.error('Error editando comanda:', error);
        if (error.code === 'INSUMO_INSUFICIENTE' || error.code === 'PRODUCTO_INSUFICIENTE' || error.code === 'PERSONALIZACION_INSUFICIENTE') {
            res.status(409).json({ error: error });
        } else if (error.message === 'Comanda no encontrada') {
            res.status(404).json({ error: error.message });
        } else if (error.message === 'La comanda debe tener items') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message || 'Error interno al editar comanda' });
        }
    }
});

// Change Mesa
router.patch('/:id/cambiar-mesa', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { id } = req.params;
        const { nuevas_mesas } = req.body; // Frontend sends nuevas_mesas

        if (!nuevas_mesas || !Array.isArray(nuevas_mesas) || nuevas_mesas.length === 0) {
            res.status(400).json({ error: 'Se requieren mesas' });
            return;
        }

        const mesaIds = nuevas_mesas.map((m: any) => m.id || m); // Handle object or ID string

        await comandaService.cambiarMesa(id, empresaId, mesaIds);
        
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error cambiando mesa:', error);
        res.status(500).json({ error: 'Error al cambiar mesa' });
    }
});

// Combine Comandas
router.patch('/:id/combinar', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { id } = req.params; // Target Comanda
        const { origen_id } = req.body; // Frontend sends origen_id

        if (!origen_id) {
            res.status(400).json({ error: 'Se requiere comanda de origen' });
            return;
        }

        await comandaService.combinarComandas(id, origen_id, empresaId);
        
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error combinando comandas:', error);
        res.status(500).json({ error: 'Error al combinar comandas' });
    }
});

// Close/Pay Comanda
router.post('/:id/cerrar', verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { id } = req.params;
        const { metodo, monto, cambio } = req.body;

        if (!metodo) {
            res.status(400).json({ error: 'Método de pago requerido' });
            return;
        }

        await comandaService.cerrarComanda(id, empresaId, { 
            metodo, 
            monto: Number(monto || 0), 
            cambio: Number(cambio || 0) 
        });
        
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error cerrando comanda:', error);
        res.status(500).json({ error: 'Error al cerrar comanda' });
    }
});

export default router;
