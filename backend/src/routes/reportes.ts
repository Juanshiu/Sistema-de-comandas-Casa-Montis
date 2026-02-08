import { Router, Request, Response } from "express";
import { ReporteService } from "../services/reporteService";
import { verificarAutenticacion, verificarPermiso } from "../middleware/authMiddleware";

const router = Router();
const reporteService = new ReporteService();

// GET /api/reportes/ventas
router.get("/ventas", verificarAutenticacion, verificarPermiso("ver_reportes"), async (req: Request, res: Response) => {
    try {
        const { fecha } = req.query;
        const { empresaId } = req.context;

        if (!fecha || typeof fecha !== "string") {
            return res.status(400).json({ error: "Se requiere una fecha válida (YYYY-MM-DD)" });
        }

        const reporte = await reporteService.generarReporteDiario(empresaId, fecha);
        res.json(reporte);
    } catch (error: any) {
        console.error("Error al generar reporte de ventas:", error);
        res.status(500).json({ error: "Error interno al generar el reporte" });
    }
});

// GET /api/reportes/ventas/rango
router.get("/ventas/rango", verificarAutenticacion, verificarPermiso("ver_reportes"), async (req: Request, res: Response) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const { empresaId } = req.context;

        if (!fechaInicio || !fechaFin || typeof fechaInicio !== "string" || typeof fechaFin !== "string") {
            return res.status(400).json({ error: "Se requieren fechas válidas (fechaInicio y fechaFin)" });
        }

        const reportes = await reporteService.generarReporteRango(empresaId, fechaInicio, fechaFin);
        res.json(reportes);
    } catch (error: any) {
        console.error("Error al generar reporte de rango:", error);
        res.status(500).json({ error: "Error interno al generar el reporte" });
    }
});

// Otros reportes pueden a�adirse aqu� siguiendo el mismo patr�n
export default router;
