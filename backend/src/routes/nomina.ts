import express from 'express';
import { NominaService } from '../services/NominaService';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = express.Router();
const service = new NominaService();

router.use(verificarAutenticacion);

// --- CONFIGURACI�N ---
router.get('/configuracion', async (req, res) => {
    try {
        const config = await service.obtenerConfiguracion(req.context.empresaId);
        res.json(config);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/configuracion', async (req, res) => {
    try {
        const config = await service.guardarConfiguracion(req.context.empresaId, req.body);
        res.json(config);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- EMPLEADOS ---
router.get('/empleados', async (req, res) => {
    try {
        const empleados = await service.listarEmpleados(req.context.empresaId);
        res.json(empleados);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/empleados', async (req, res) => {
    try {
        const nuevo = await service.crearEmpleado(req.context.empresaId, req.body);
        res.status(201).json(nuevo);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- GENERACIÓN ---
router.post('/calcular', async (req, res) => {
    try {
        console.log('📊 Calcular nómina - Body:', req.body);
        const resultado = await service.calcularNominaEmpleado(req.context.empresaId, req.body);
        res.json(resultado);
    } catch (error: any) {
        console.error('❌ Error en /calcular:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/generar', async (req, res) => {
    try {
        const { mes, anio } = req.body;
        const resultados = await service.generarNominaMes(req.context.empresaId, mes, anio);
        res.json(resultados);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- GUARDAR DETALLE DE NÓMINA ---
router.post('/detalle/guardar', async (req, res) => {
    try {
        console.log('💾 Guardar nómina - Body:', req.body);
        const resultado = await service.guardarNominaDetalle(req.context.empresaId, req.body);
        res.json(resultado);
    } catch (error: any) {
        console.error('❌ Error en /detalle/guardar:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- HISTORIAL DE NÓMINA --- (debe estar ANTES de /:id)
router.get('/historial', async (req, res) => {
    try {
        const { empleado_id, periodo_mes, periodo_anio } = req.query;
        if (!empleado_id) {
            return res.status(400).json({ error: 'empleado_id es requerido' });
        }
        const resultado = await service.obtenerHistorialNomina(
            req.context.empresaId,
            empleado_id as string,
            periodo_mes as string | undefined,
            periodo_anio ? parseInt(periodo_anio as string) : undefined
        );
        res.json(resultado);
    } catch (error: any) {
        console.error('❌ Error en /historial:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- ELIMINAR HISTORIAL DE NÓMINA ---
router.delete('/historial', async (req, res) => {
    try {
        const { tipo, periodo_mes, periodo_anio, fecha_inicio, fecha_fin } = req.body;
        const { empresaId } = req.context;

        if (!tipo || (tipo !== 'periodo' && tipo !== 'fecha')) {
            return res.status(400).json({ error: 'Tipo de eliminación inválido' });
        }

        let deletedCount = 0;

        if (tipo === 'periodo') {
            if (!periodo_mes || !periodo_anio) {
                return res.status(400).json({ error: 'periodo_mes y periodo_anio son requeridos' });
            }
            
            // Eliminar por periodo específico
            const result = await service.eliminarHistorialPorPeriodo(
                empresaId,
                periodo_mes,
                periodo_anio
            );
            deletedCount = result.deletedCount;
        } else {
            if (!fecha_inicio || !fecha_fin) {
                return res.status(400).json({ error: 'fecha_inicio y fecha_fin son requeridas' });
            }
            
            // Eliminar por rango de fechas
            const result = await service.eliminarHistorialPorFechas(
                empresaId,
                fecha_inicio,
                fecha_fin
            );
            deletedCount = result.deletedCount;
        }

        res.json({
            success: true,
            message: `Historial de nómina eliminado correctamente`,
            deletedCount
        });
    } catch (error: any) {
        console.error('❌ Error al eliminar historial de nómina:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- GENERAR PDF PREVIEW ---
router.post('/generar-pdf-preview', async (req, res) => {
    try {
        const { nomina_detalle } = req.body;
        const pdfBuffer = await service.generarPDFPreview(req.context.empresaId, nomina_detalle);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=nomina_preview.pdf');
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error('❌ Error en /generar-pdf-preview:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- LIQUIDACIÓN ---
router.post('/liquidacion/calcular', async (req, res) => {
    try {
        console.log('📊 Calcular liquidación - Body:', req.body);
        const resultado = await service.calcularLiquidacion(req.context.empresaId, req.body);
        res.json(resultado);
    } catch (error: any) {
        console.error('❌ Error en /liquidacion/calcular:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/liquidacion/pdf-preview', async (req, res) => {
    try {
        const { liquidacion } = req.body;
        const pdfBuffer = await service.generarPDFLiquidacion(req.context.empresaId, liquidacion);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=liquidacion.pdf');
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error('❌ Error en /liquidacion/pdf-preview:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- RUTAS CON PARÁMETROS (deben estar AL FINAL) ---

// --- REGISTRAR PAGO DE NÓMINA ---
router.post('/detalle/:id/pagos', async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await service.registrarPago(req.context.empresaId, id, req.body);
        res.json(resultado);
    } catch (error: any) {
        console.error('❌ Error en /detalle/:id/pagos:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- DESCARGAR PDF DE NÓMINA ---
router.get('/detalle/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;
        const pdfBuffer = await service.generarPDFNomina(req.context.empresaId, id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=nomina_${id}.pdf`);
        res.send(pdfBuffer);
    } catch (error: any) {
        console.error('❌ Error en /detalle/:id/pdf:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- OBTENER NÓMINA POR ID (debe estar al final por el parámetro dinámico) ---
router.get('/:id', async (req, res) => {
    try {
        const nomina = await service.obtenerNominaCompleta(req.params.id, req.context.empresaId);
        if (!nomina) return res.status(404).json({ error: 'Nómina no encontrada' });
        res.json(nomina);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
