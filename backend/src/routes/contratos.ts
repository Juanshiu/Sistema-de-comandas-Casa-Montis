
import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { numeroALetras } from '../utils/numeroALetras';
import { verificarAutenticacion, verificarPermiso } from '../middleware/authMiddleware';

const router = Router();

// Ensure storage directory exists
const storageDir = path.resolve(__dirname, '../../storage/contratos');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Helper para convertir fecha YYYY-MM-DD a formato legible (DD de MM de YYYY)
function formatearFechaLegible(fechaStr: string): string {
    if (!fechaStr) return '_______________';
    const date = new Date(fechaStr);
    // Ajustar zona horaria si es necesario, o asumir que la fecha es correcta.
    // Usaremos un array de meses simple para evitar problemas de locale en el servidor
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // Asumiendo que la fecha viene como YYYY-MM-DD y queremos evitar conversión a UTC que cambie el día
    const parts = fechaStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        return `${day} de ${meses[month]} de ${year}`;
    }
    return fechaStr;
}

router.post('/generar', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req: Request, res: Response) => {
    try {
        const { empleado_id, contrato_details } = req.body;

        if (!empleado_id || !contrato_details) {
            return res.status(400).json({ error: 'Faltan datos requeridos (empleado_id o contrato_details)' });
        }

        // 1. Fetch Company Info
        const empresa: any = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM config_facturacion ORDER BY id DESC LIMIT 1', [], (err, row) => {
                if (err) reject(err);
                resolve(row || {});
            });
        });

        // 2. Fetch Employee Info
        const empleado: any = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM empleados WHERE id = ?', [empleado_id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!empleado) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        // 3. Prepare Variables
        // Empresa
        const NOMBRE_EMPLEADOR = empresa.representante_legal ? empresa.representante_legal.toUpperCase() : 'REPRESENTANTE LEGAL';
        const IDENTIFICACION_EMPLEADOR = empresa.nit || 'NIT';
        const RAZON_SOCIAL = empresa.nombre_empresa ? empresa.nombre_empresa.toUpperCase() : 'CASA MONTIS';
        const DIRECCION_EMPRESA = empresa.direccion ? empresa.direccion.toUpperCase() : '';
        const MUNICIPIO_EMPRESA = empresa.ciudad ? empresa.ciudad.toUpperCase() : (empresa.ubicacion_geografica ? empresa.ubicacion_geografica.toUpperCase() : '');

        // Empleado
        const NOMBRE_TRABAJADOR = `${empleado.nombres} ${empleado.apellidos}`.toUpperCase();
        const CEDULA_TRABAJADOR = empleado.numero_documento;
        const DIRECCION_TRABAJADOR = empleado.direccion ? empleado.direccion.toUpperCase() : '';
        const MUNICIPIO_TRABAJADOR = empleado.municipio ? empleado.municipio.toUpperCase() : ''; 
        
        const CARGO = empleado.cargo ? empleado.cargo.toUpperCase() : '';
        const SALARIO = empleado.salario_base || 0;
        const SALARIO_LETRAS = numeroALetras(SALARIO);

        // Form Details
        const {
            TIPO_CONTRATO,
            DURACION_CONTRATO,
            FECHA_INICIO,
            FECHA_FIN,
            PERIODO_PRUEBA,
            DIAS_LABORADOS,
            HORARIO_TRABAJO,
            FORMA_PAGO,
            PERIODO_PAGO,
            FECHAS_PAGO,
            LUGAR_FIRMA,
            FECHA_FIRMA
        } = contrato_details;

        // Formatear fechas si vienen en YYYY-MM-DD
        const fechaInicioFmt = formatearFechaLegible(FECHA_INICIO);
        const fechaFinFmt = formatearFechaLegible(FECHA_FIN);
        const fechaFirmaFmt = formatearFechaLegible(FECHA_FIRMA);

        // 4. Read Template
        const templatePath = path.resolve(__dirname, '../../CONTRATO.TXT');
        if (!fs.existsSync(templatePath)) {
            return res.status(500).json({ error: 'Plantilla de contrato no encontrada en el servidor' });
        }
        let content = fs.readFileSync(templatePath, 'utf-8');

        // 5. Replace Variables
        const replacements: {[key: string]: string} = {
            '{{NOMBRE_EMPLEADOR}}': NOMBRE_EMPLEADOR,
            '{{IDENTIFICACION_EMPLEADOR}}': IDENTIFICACION_EMPLEADOR,
            '{{RAZON_SOCIAL}}': RAZON_SOCIAL,
            '{{DIRECCION_EMPRESA}}': DIRECCION_EMPRESA,
            '{{MUNICIPIO_EMPRESA}}': MUNICIPIO_EMPRESA,
            '{{NOMBRE_TRABAJADOR}}': NOMBRE_TRABAJADOR,
            '{{CEDULA_TRABAJADOR}}': CEDULA_TRABAJADOR,
            '{{DIRECCION_TRABAJADOR}}': DIRECCION_TRABAJADOR,
            '{{MUNICIPIO_TRABAJADOR}}': MUNICIPIO_TRABAJADOR,
            '{{CARGO}}': CARGO,
            '{{SALARIO}}': `$${SALARIO.toLocaleString('es-CO')}`,
            '{{SALARIO_LETRAS}}': `${SALARIO_LETRAS} PESOS M/CTE`,
            '{{TIPO_CONTRATO}}': TIPO_CONTRATO ? TIPO_CONTRATO.toUpperCase() : '_______________',
            '{{DURACION_CONTRATO}}': DURACION_CONTRATO ? DURACION_CONTRATO.toUpperCase() : '_______________',
            '{{FECHA_INICIO}}': fechaInicioFmt,
            '{{FECHA_FIN}}': fechaFinFmt,
            '{{PERIODO_PRUEBA}}': PERIODO_PRUEBA ? PERIODO_PRUEBA.toUpperCase() : '_______________',
            '{{DIAS_LABORADOS}}': DIAS_LABORADOS ? DIAS_LABORADOS.toUpperCase() : '_______________',
            '{{HORARIO_TRABAJO}}': HORARIO_TRABAJO ? HORARIO_TRABAJO.toUpperCase() : '_______________',
            '{{FORMA_PAGO}}': FORMA_PAGO ? FORMA_PAGO.toUpperCase() : '_______________',
            '{{PERIODO_PAGO}}': PERIODO_PAGO ? PERIODO_PAGO.toUpperCase() : '_______________',
            '{{FECHAS_PAGO}}': FECHAS_PAGO ? FECHAS_PAGO.toUpperCase() : '_______________',
            '{{LUGAR_FIRMA}}': LUGAR_FIRMA ? LUGAR_FIRMA.toUpperCase() : MUNICIPIO_EMPRESA,
            '{{FECHA_FIRMA}}': fechaFirmaFmt
        };

        // Replace bullets and problematic characters for Helvetica
        content = content.replace(/[•·▪]/g, '-');
        content = content.replace(/\t/g, '    '); // Replace tabs with spaces

        for (const [key, value] of Object.entries(replacements)) {
            // Global replace (replaceAll logic)
            content = content.split(key).join(value || '');
        }

        // 6. Generate PDF
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'LETTER'
        });
        
        const fileName = `Contrato_${empleado.numero_documento}_${Date.now()}.pdf`;
        const filePath = path.join(storageDir, fileName);
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        // Content processing
        const paragraphs = content.split(/\r?\n/); // Split by lines to preserve structure better
        
        // Use Arial if available, otherwise fallback to Helvetica
        const fontRegular = fs.existsSync('C:/Windows/Fonts/arial.ttf') ? 'C:/Windows/Fonts/arial.ttf' : 'Helvetica';
        const fontBold = fs.existsSync('C:/Windows/Fonts/arialbd.ttf') ? 'C:/Windows/Fonts/arialbd.ttf' : 'Helvetica-Bold';

        doc.font(fontRegular).fontSize(12);

        let previousLineWasEmpty = false;
        let inSignatureSection = false;

        for (let i = 0; i < paragraphs.length; i++) {
            const line = paragraphs[i];
            const trimmedLine = line.trim();
            
            // Detect signature section start (usually starts with many underscores after the content)
            if (trimmedLine.startsWith('EL EMPLEADOR,') && line.includes('EL TRABAJADOR,')) {
                inSignatureSection = true;
                doc.moveDown(2);
                
                // Draw signatures in two columns
                const startY = doc.y;
                const columnWidth = (doc.page.width - 100) / 2;
                
                // 1. Labels
                doc.font(fontBold).fontSize(12);
                doc.text('EL EMPLEADOR,', 50, startY, { width: columnWidth, align: 'left' });
                doc.text('EL TRABAJADOR,', 50 + columnWidth, startY, { width: columnWidth, align: 'left' });
                
                // 2. Lines (underscores)
                doc.moveDown(3);
                const lineY = doc.y;
                doc.text('____________________', 50, lineY, { width: columnWidth, align: 'left' });
                doc.text('____________________', 50 + columnWidth, lineY, { width: columnWidth, align: 'left' });
                
                // 3. Names and CC
                doc.moveDown(1);
                const nameY = doc.y;
                
                // However, it's better to just use the variables directly here to be safe
                doc.font(fontRegular).fontSize(11);
                doc.text(NOMBRE_EMPLEADOR, 50, nameY, { width: columnWidth, align: 'left' });
                doc.text(NOMBRE_TRABAJADOR, 50 + columnWidth, nameY, { width: columnWidth, align: 'left' });
                
                doc.moveDown(0.5);
                const ccY = doc.y;
                doc.text(`C.C. ${IDENTIFICACION_EMPLEADOR}`, 50, ccY, { width: columnWidth, align: 'left' });
                doc.text(`C.C. ${CEDULA_TRABAJADOR}`, 50 + columnWidth, ccY, { width: columnWidth, align: 'left' });
                
                // Skip the next lines since we already handled them
                i = paragraphs.length; // End loop
                continue;
            }

            if (trimmedLine === '') {
                if (!previousLineWasEmpty) {
                     doc.moveDown();
                }
                previousLineWasEmpty = true;
                continue;
            }
            previousLineWasEmpty = false;

            // Check for titles
            const isTitle = trimmedLine.startsWith('ARTÍCULO') || 
                            trimmedLine.startsWith('CONTRATO DE TRABAJO') ||
                            trimmedLine === 'Entre las partes:';

            if (isTitle) {
                doc.moveDown(0.5);
                doc.font(fontBold).fontSize(14);
                doc.text(trimmedLine, { align: 'left' });
                doc.font(fontRegular).fontSize(12);
            } else {
                 // Regular text
                 // If it starts with dash (was bullet), indent
                 if (trimmedLine.startsWith('-')) {
                     doc.text(trimmedLine, { indent: 15, align: 'justify' });
                 } else {
                     doc.text(trimmedLine, { align: 'justify' });
                 }
            }
        }

        doc.end();

        writeStream.on('finish', async () => {
            try {
                // Save to database
                const usuario_nombre = (req as any).user?.usuario || 'Sistema';
                const usuario_id = (req as any).user?.id || null;

                await new Promise<void>((resolve, reject) => {
                    db.run(`
                        INSERT INTO contratos (
                            empleado_id, tipo_contrato, fecha_inicio, fecha_fin, 
                            duracion_contrato, cargo, salario, file_name, file_path, 
                            contrato_details, usuario_id, usuario_nombre
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        empleado_id,
                        TIPO_CONTRATO,
                        FECHA_INICIO,
                        FECHA_FIN || null,
                        DURACION_CONTRATO,
                        empleado.cargo,
                        empleado.salario_base,
                        fileName,
                        filePath,
                        JSON.stringify(contrato_details),
                        usuario_id,
                        usuario_nombre
                    ], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                res.json({ 
                    success: true, 
                    message: 'Contrato generado correctamente',
                    url: `/api/contratos/download/${fileName}`,
                    file_name: fileName
                });
            } catch (dbErr) {
                console.error('Error saving contract to DB:', dbErr);
                // Even if DB fails, we have the file, but we should notify or handle it
                res.json({ 
                    success: true, 
                    message: 'Contrato generado correctamente (Error guardando en historial)',
                    url: `/api/contratos/download/${fileName}`,
                    file_name: fileName
                });
            }
        });
        
        writeStream.on('error', (err) => {
            console.error('Error writing PDF:', err);
            res.status(500).json({ error: 'Error generando archivo PDF' });
        });

    } catch (error: any) {
        console.error('Error generando contrato:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download route
router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(storageDir, safeFilename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('Archivo no encontrado');
    }
});

// Historial por empleado
router.get('/historial/:empleado_id', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req, res) => {
    try {
        const { empleado_id } = req.params;
        const historial: any[] = await new Promise((resolve, reject) => {
            db.all(`
                SELECT * FROM contratos 
                WHERE empleado_id = ? 
                ORDER BY created_at DESC
            `, [empleado_id], (err, rows) => {
                if (err) reject(err);
                resolve(rows || []);
            });
        });

        // Parse JSON details for each contract
        const result = historial.map(c => ({
            ...c,
            contrato_details: c.contrato_details ? JSON.parse(c.contrato_details) : {}
        }));

        res.json(result);
    } catch (error: any) {
        console.error('Error obteniendo historial de contratos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar contrato
router.delete('/:id', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Obtener información del contrato para borrar el archivo
        const contrato: any = await new Promise((resolve, reject) => {
            db.get('SELECT file_path FROM contratos WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!contrato) {
            return res.status(404).json({ error: 'Contrato no encontrado' });
        }

        // 2. Borrar el archivo físico si existe
        if (contrato.file_path && fs.existsSync(contrato.file_path)) {
            try {
                fs.unlinkSync(contrato.file_path);
            } catch (err) {
                console.error('Error al borrar el archivo físico del contrato:', err);
                // Continuamos aunque falle el borrado del archivo
            }
        }

        // 3. Borrar el registro de la base de datos
        await new Promise<void>((resolve, reject) => {
            db.run('DELETE FROM contratos WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        res.json({ success: true, message: 'Contrato eliminado correctamente' });
    } catch (error: any) {
        console.error('Error al eliminar contrato:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
