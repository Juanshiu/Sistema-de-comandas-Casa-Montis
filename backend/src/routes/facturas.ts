import { Router, Request, Response } from "express";
import { FacturaService } from "../services/facturaService";
import { verificarAutenticacion, verificarPermiso } from "../middleware/authMiddleware";

const router = Router();
const facturaService = new FacturaService();

// Crear factura
router.post("/", verificarAutenticacion, verificarPermiso("gestionar_caja"), async (req: Request, res: Response) => {
    try {
        const { comanda_id, metodo_pago, monto_pagado, cambio, cliente_nombre, cliente_rut } = req.body;
        const { empresaId } = req.context;

        if (!comanda_id || !metodo_pago) {
            return res.status(400).json({ error: "Faltan campos requeridos: comanda_id, metodo_pago" });
        }

        const factura = await facturaService.crearFactura({
            comandaId: comanda_id,
            empresaId,
            metodoPago: metodo_pago,
            montoPagado: monto_pagado,
            cambio: cambio,
            clienteNombre: cliente_nombre,
            clienteRut: cliente_rut
        });

        res.status(201).json(factura);
    } catch (error: any) {
        console.error("Error al crear factura:", error);
        res.status(500).json({ error: error.message || "Error al procesar la factura" });
    }
});

// Listar facturas de la empresa
router.get("/", verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const facturas = await facturaService.obtenerFacturas(empresaId);
        res.json(facturas);
    } catch (error: any) {
        res.status(500).json({ error: "Error al obtener facturas" });
    }
});

// Obtener detalle de factura
router.get("/:id", verificarAutenticacion, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { empresaId } = req.context;

        const detalle = await facturaService.obtenerDetalleFactura(id, empresaId);
        if (!detalle) {
            return res.status(404).json({ error: "Factura no encontrada" });
        }

        res.json(detalle);
    } catch (error: any) {
        res.status(500).json({ error: "Error al obtener detalle de factura" });
    }
});

export default router;
