import { Router, Request, Response } from "express";
import { ConfigFacturacionRepository } from "../repositories/configFacturacionRepository";
import { verificarAutenticacion, verificarPermiso } from "../middleware/authMiddleware";

const router = Router();
const repo = new ConfigFacturacionRepository();

// GET - Obtener configuraci�n de facturaci�n de la empresa
router.get("/", verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const config = await repo.findByEmpresaId(empresaId);

        if (!config) {
            // Valores por defecto para una nueva empresa
            return res.json({
                nombre_empresa: "Nueva Empresa",
                nit: "000000000-0",
                responsable_iva: false,
                porcentaje_iva: 19,
                direccion: "",
                telefonos: []
            });
        }

        res.json(config);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST/PUT - Guardar/Actualizar configuración
router.post("/", verificarAutenticacion, verificarPermiso("gestionar_sistema"), async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const configData = req.body;

        const updated = await repo.upsert(empresaId, configData);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT también soportado para compatibilidad con frontend
router.put("/", verificarAutenticacion, verificarPermiso("gestionar_sistema"), async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const configData = req.body;

        console.log('=== PUT /api/configuracion/facturacion ===');
        console.log('empresaId:', empresaId);
        console.log('Datos recibidos:', JSON.stringify(configData, null, 2));

        // Verificar que empresaId esté presente
        if (!empresaId) {
            return res.status(400).json({ error: 'empresaId es requerido en el contexto' });
        }

        const updated = await repo.upsert(empresaId, configData);
        
        console.log('Datos actualizados exitosamente:', updated?.id);
        res.json(updated);
    } catch (error: any) {
        console.error('Error al actualizar configuración:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
