
import { Router, Request, Response } from 'express';
import { db } from '../database/database';
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

// ==================== CONSTANTES ====================

const MAX_TEMPLATE_LENGTH = 50000;

const VARIABLES_DISPONIBLES = {
    empresa: [
        { variable: '{{NOMBRE_EMPLEADOR}}', descripcion: 'Nombre / Razón social del empleador' },
        { variable: '{{IDENTIFICACION_EMPLEADOR}}', descripcion: 'NIT o cédula del empleador' },
        { variable: '{{RAZON_SOCIAL}}', descripcion: 'Razón social del establecimiento' },
        { variable: '{{DIRECCION_EMPRESA}}', descripcion: 'Dirección de la empresa' },
        { variable: '{{MUNICIPIO_EMPRESA}}', descripcion: 'Municipio de la empresa' },
    ],
    empleado: [
        { variable: '{{NOMBRE_TRABAJADOR}}', descripcion: 'Nombre completo del trabajador' },
        { variable: '{{CEDULA_TRABAJADOR}}', descripcion: 'Cédula del trabajador' },
        { variable: '{{DIRECCION_TRABAJADOR}}', descripcion: 'Dirección del trabajador' },
        { variable: '{{MUNICIPIO_TRABAJADOR}}', descripcion: 'Municipio del trabajador' },
        { variable: '{{CARGO}}', descripcion: 'Cargo del trabajador' },
        { variable: '{{SALARIO}}', descripcion: 'Salario formateado ($X.XXX.XXX)' },
        { variable: '{{SALARIO_LETRAS}}', descripcion: 'Salario en letras (PESOS M/CTE)' },
    ],
    contrato: [
        { variable: '{{TIPO_CONTRATO}}', descripcion: 'Tipo de contrato' },
        { variable: '{{DURACION_CONTRATO}}', descripcion: 'Duración del contrato' },
        { variable: '{{FECHA_INICIO}}', descripcion: 'Fecha de inicio (formato legible)' },
        { variable: '{{FECHA_FIN}}', descripcion: 'Fecha de finalización (formato legible)' },
        { variable: '{{PERIODO_PRUEBA}}', descripcion: 'Período de prueba' },
        { variable: '{{DIAS_LABORADOS}}', descripcion: 'Días laborados semanalmente' },
        { variable: '{{HORARIO_TRABAJO}}', descripcion: 'Horario de trabajo' },
        { variable: '{{FORMA_PAGO}}', descripcion: 'Forma de pago' },
        { variable: '{{PERIODO_PAGO}}', descripcion: 'Período de pago' },
        { variable: '{{FECHAS_PAGO}}', descripcion: 'Días específicos de pago' },
        { variable: '{{LUGAR_FIRMA}}', descripcion: 'Lugar de firma del contrato' },
        { variable: '{{FECHA_FIRMA}}', descripcion: 'Fecha de firma (formato legible)' },
    ]
};

// ==================== HELPERS ====================

function formatearFechaLegible(fechaStr: string | undefined | null): string {
    if (!fechaStr) return '_______________';
    try {
        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        const d = new Date(fechaStr + 'T12:00:00');
        return `${d.getDate()} DE ${meses[d.getMonth()]} DE ${d.getFullYear()}`;
    } catch {
        return fechaStr;
    }
}

function sanitizarPlantilla(texto: string): string {
    return texto
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
}

// ==================== PARSER DE MARCADO LIGERO ====================

/** Estilo dominante de una línea (un solo estilo por línea, sin anidamiento) */
type LineStyle = 'bold' | 'italic' | 'underline' | 'bullet' | 'normal';

function parseLineStyle(line: string): { style: LineStyle; text: string } {
    const trimmed = line.trim();
    if (!trimmed) return { style: 'normal', text: '' };

    // Viñetas: - texto o • texto (al inicio de línea)
    if (/^[-•]\s+/.test(trimmed)) {
        return { style: 'bullet', text: trimmed.replace(/^[-•]\s+/, '') };
    }

    // Negrilla: **texto**
    const boldMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
        return { style: 'bold', text: boldMatch[1] };
    }

    // Subrayado: __texto__ (verificar antes de cursiva porque __ contiene _)
    const underlineMatch = trimmed.match(/^__(.+)__$/);
    if (underlineMatch) {
        return { style: 'underline', text: underlineMatch[1] };
    }

    // Cursiva: _texto_ (excluyendo __ que ya fue capturado arriba)
    const italicMatch = trimmed.match(/^_([^_].*)_$/);
    if (italicMatch) {
        return { style: 'italic', text: italicMatch[1] };
    }

    return { style: 'normal', text: trimmed };
}

function cargarPlantillaPorDefecto(): string {
    try {
        const contratoPath = path.resolve(__dirname, '../../CONTRATO.TXT');
        return fs.readFileSync(contratoPath, 'utf-8');
    } catch {
        return 'CONTRATO DE TRABAJO\n\nNo se encontró la plantilla por defecto. Por favor configure una plantilla en el sistema.';
    }
}

/** Obtiene la plantilla activa para una empresa: primero busca plantilla default de empresa, luego archivo */
async function obtenerPlantillaEmpresa(empresaId: string): Promise<{ contenido: string; origen: 'empresa' | 'archivo'; plantillaId?: string; nombre?: string }> {
    try {
        const plantillaEmpresa = await db.selectFrom('plantillas_contrato')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .where('es_default', '=', true)
            .executeTakeFirst();

        if (plantillaEmpresa) {
            return {
                contenido: plantillaEmpresa.contenido,
                origen: 'empresa',
                plantillaId: plantillaEmpresa.id,
                nombre: plantillaEmpresa.nombre
            };
        }
    } catch (err) {
        // La tabla puede no existir aún si la migración no se ha corrido
        console.warn('Aviso: tabla plantillas_contrato no disponible aún, usando archivo:', (err as Error).message);
    }

    return {
        contenido: cargarPlantillaPorDefecto(),
        origen: 'archivo'
    };
}

// ==================== ENDPOINTS DE PLANTILLAS (CRUD Multi-tenant) ====================

// Listar plantillas de la empresa
router.get('/plantillas', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;

        const plantillas = await db.selectFrom('plantillas_contrato')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .orderBy('es_default', 'desc')
            .orderBy('updated_at', 'desc')
            .execute();

        res.json(plantillas);
    } catch (error: any) {
        console.error('Error listando plantillas:', error);
        res.status(500).json({ error: error.message });
    }
});

// Crear nueva plantilla
router.post('/plantillas', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { nombre, contenido, es_default } = req.body;

        if (!nombre || !contenido) {
            return res.status(400).json({ error: 'Se requiere nombre y contenido para la plantilla' });
        }

        if (contenido.length > MAX_TEMPLATE_LENGTH) {
            return res.status(400).json({ error: `La plantilla excede el límite de ${MAX_TEMPLATE_LENGTH.toLocaleString()} caracteres` });
        }

        const contenidoSanitizado = sanitizarPlantilla(contenido);

        // Si se marca como default, quitar default de las demás
        if (es_default) {
            await db.updateTable('plantillas_contrato')
                .set({ es_default: false })
                .where('empresa_id', '=', empresaId)
                .where('es_default', '=', true)
                .execute();
        }

        const resultado = await db.insertInto('plantillas_contrato')
            .values({
                empresa_id: empresaId,
                nombre: nombre.trim(),
                contenido: contenidoSanitizado,
                es_default: es_default || false,
                updated_at: new Date()
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        res.json({ success: true, plantilla: resultado });
    } catch (error: any) {
        console.error('Error creando plantilla:', error);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar plantilla existente
router.put('/plantillas/:id', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { empresaId } = req.context;
        const { nombre, contenido } = req.body;

        if (!nombre && !contenido) {
            return res.status(400).json({ error: 'Se requiere al menos nombre o contenido para actualizar' });
        }

        if (contenido && contenido.length > MAX_TEMPLATE_LENGTH) {
            return res.status(400).json({ error: `La plantilla excede el límite de ${MAX_TEMPLATE_LENGTH.toLocaleString()} caracteres` });
        }

        const updateData: any = { updated_at: new Date() };
        if (nombre) updateData.nombre = nombre.trim();
        if (contenido) updateData.contenido = sanitizarPlantilla(contenido);

        const resultado = await db.updateTable('plantillas_contrato')
            .set(updateData)
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .returningAll()
            .executeTakeFirst();

        if (!resultado) {
            return res.status(404).json({ error: 'Plantilla no encontrada' });
        }

        res.json({ success: true, plantilla: resultado });
    } catch (error: any) {
        console.error('Error actualizando plantilla:', error);
        res.status(500).json({ error: error.message });
    }
});

// Establecer plantilla como default de la empresa
router.put('/plantillas/:id/set-default', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { empresaId } = req.context;

        // Verificar que la plantilla existe y pertenece a la empresa
        const plantilla = await db.selectFrom('plantillas_contrato')
            .select('id')
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();

        if (!plantilla) {
            return res.status(404).json({ error: 'Plantilla no encontrada' });
        }

        // Quitar default de todas las plantillas de la empresa
        await db.updateTable('plantillas_contrato')
            .set({ es_default: false, updated_at: new Date() })
            .where('empresa_id', '=', empresaId)
            .execute();

        // Establecer la nueva default
        await db.updateTable('plantillas_contrato')
            .set({ es_default: true, updated_at: new Date() })
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .execute();

        res.json({ success: true, message: 'Plantilla establecida como predeterminada' });
    } catch (error: any) {
        console.error('Error estableciendo plantilla default:', error);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar plantilla
router.delete('/plantillas/:id', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { empresaId } = req.context;

        const resultado = await db.deleteFrom('plantillas_contrato')
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();

        if (!resultado || Number(resultado.numDeletedRows) === 0) {
            return res.status(404).json({ error: 'Plantilla no encontrada' });
        }

        res.json({ success: true, message: 'Plantilla eliminada correctamente' });
    } catch (error: any) {
        console.error('Error eliminando plantilla:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ENDPOINTS DE PLANTILLA DEFAULT Y VARIABLES ====================

// Obtener plantilla por defecto (prioriza la de empresa, luego archivo)
router.get('/plantilla-default', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req: Request, res: Response) => {
    try {
        const { empresaId } = req.context;
        const { contenido, origen, plantillaId, nombre } = await obtenerPlantillaEmpresa(empresaId);

        res.json({
            plantilla: contenido,
            variables: VARIABLES_DISPONIBLES,
            origen,
            plantillaId: plantillaId || null,
            nombrePlantilla: nombre || null
        });
    } catch (error: any) {
        console.error('Error obteniendo plantilla default:', error);
        // Fallback seguro
        res.json({
            plantilla: cargarPlantillaPorDefecto(),
            variables: VARIABLES_DISPONIBLES,
            origen: 'archivo',
            plantillaId: null,
            nombrePlantilla: null
        });
    }
});

// Variables disponibles
router.get('/variables', verificarAutenticacion, verificarPermiso('nomina.gestion'), (_req: Request, res: Response) => {
    res.json(VARIABLES_DISPONIBLES);
});

// ==================== GENERAR CONTRATO PDF ====================

router.post('/generar', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req: Request, res: Response) => {
    try {
        const { empresaId, userId: usuarioId } = req.context;
        const { empleado_id, contrato_details, contrato_template } = req.body;

        if (!empleado_id || !contrato_details) {
            return res.status(400).json({ error: 'Faltan datos requeridos (empleado_id o contrato_details)' });
        }

        // 1. Determinar la plantilla a usar
        let templateOriginal: string;
        if (contrato_template && typeof contrato_template === 'string' && contrato_template.trim().length > 0) {
            if (contrato_template.length > MAX_TEMPLATE_LENGTH) {
                return res.status(400).json({ 
                    error: `La plantilla excede el límite de ${MAX_TEMPLATE_LENGTH.toLocaleString()} caracteres` 
                });
            }
            templateOriginal = sanitizarPlantilla(contrato_template);
        } else {
            // Usar plantilla de empresa o archivo por defecto
            const { contenido } = await obtenerPlantillaEmpresa(empresaId);
            templateOriginal = contenido;
        }

        // 2. Fetch Company Info
        const empresa = await db.selectFrom('config_facturacion')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            // @ts-ignore
            .where('activo', '=', true)
            .executeTakeFirst();

        // 3. Fetch Employee Info
        const empleado = await db.selectFrom('empleados')
            .selectAll()
            .where('id', '=', empleado_id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();

        if (!empleado) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        // 4. Preparar variables de reemplazo
        const RAZON_SOCIAL = ((empresa as any)?.nombre_empresa || empresa?.razon_social || 'MONTIS CLOUD').toUpperCase();
        const NOMBRE_EMPLEADOR = RAZON_SOCIAL; 
        const IDENTIFICACION_EMPLEADOR = (empresa as any)?.nit || empresa?.rut || 'NIT';
        const DIRECCION_EMPRESA = (empresa?.direccion || '').toUpperCase();
        const MUNICIPIO_EMPRESA = ((empresa as any)?.ciudad || empresa?.giro || '').toUpperCase(); 

        const NOMBRE_TRABAJADOR = `${empleado.nombres} ${empleado.apellidos}`.toUpperCase();
        const CEDULA_TRABAJADOR = empleado.numero_documento || '';
        const DIRECCION_TRABAJADOR = (empleado.direccion || '').toUpperCase();
        const MUNICIPIO_TRABAJADOR = (empleado.municipio || '').toUpperCase(); 
        
        const CARGO = (empleado.cargo || '').toUpperCase();
        const SALARIO = empleado.salario_base || 0;
        const SALARIO_LETRAS = numeroALetras(Number(SALARIO));

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

        const fechaInicioFmt = formatearFechaLegible(FECHA_INICIO);
        const fechaFinFmt = formatearFechaLegible(FECHA_FIN);
        const fechaFirmaFmt = formatearFechaLegible(FECHA_FIRMA);

        // 5. Reemplazar variables en la plantilla
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
            '{{SALARIO}}': `$${Number(SALARIO).toLocaleString('es-CO')}`,
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

        let content = templateOriginal;
        content = content.replace(/\t/g, '    ');

        for (const [key, value] of Object.entries(replacements)) {
            content = content.split(key).join(value || '');
        }

        // 6. Generar PDF
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'LETTER'
        });
        
        const fileName = `Contrato_${empleado.numero_documento}_${Date.now()}.pdf`;
        const filePath = path.join(storageDir, fileName);
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        const paragraphs = content.split(/\r?\n/);
        
        const fontRegular = fs.existsSync('C:/Windows/Fonts/arial.ttf') ? 'C:/Windows/Fonts/arial.ttf' : 'Helvetica';
        const fontBold = fs.existsSync('C:/Windows/Fonts/arialbd.ttf') ? 'C:/Windows/Fonts/arialbd.ttf' : 'Helvetica-Bold';
        const fontItalic = fs.existsSync('C:/Windows/Fonts/ariali.ttf') ? 'C:/Windows/Fonts/ariali.ttf' : 'Helvetica-Oblique';

        doc.font(fontRegular).fontSize(12);

        let previousLineWasEmpty = false;

        for (let i = 0; i < paragraphs.length; i++) {
            const line = paragraphs[i];
            const trimmedLine = line.trim();
            
            // Detectar bloque de firma (EL EMPLEADOR / EL TRABAJADOR)
            if (trimmedLine.startsWith('EL EMPLEADOR,') && line.includes('EL TRABAJADOR,')) {
                // FIX BUG: Asegurar que el bloque completo de firmas quepa en la página actual
                const signatureBlockHeight = 180;
                const pageBottom = doc.page.height - doc.page.margins.bottom;
                if (doc.y + signatureBlockHeight > pageBottom) {
                    doc.addPage();
                }

                doc.moveDown(1.5);
                const startY = doc.y;
                const columnWidth = (doc.page.width - 100) / 2;
                const leftX = 50;
                const rightX = 50 + columnWidth;
                
                doc.font(fontBold).fontSize(12);
                doc.text('EL EMPLEADOR,', leftX, startY, { width: columnWidth, align: 'left' });
                doc.text('EL TRABAJADOR,', rightX, startY, { width: columnWidth, align: 'left' });
                
                doc.moveDown(2);
                const lineY = doc.y;
                doc.text('____________________', leftX, lineY, { width: columnWidth, align: 'left' });
                doc.text('____________________', rightX, lineY, { width: columnWidth, align: 'left' });
                
                doc.moveDown(0.8);
                const nameY = doc.y;
                doc.font(fontRegular).fontSize(11);
                doc.text(NOMBRE_EMPLEADOR, leftX, nameY, { width: columnWidth, align: 'left' });
                doc.text(NOMBRE_TRABAJADOR, rightX, nameY, { width: columnWidth, align: 'left' });
                
                doc.moveDown(0.3);
                const ccY = doc.y;
                doc.text(`C.C. ${IDENTIFICACION_EMPLEADOR}`, leftX, ccY, { width: columnWidth, align: 'left' });
                doc.text(`C.C. ${CEDULA_TRABAJADOR}`, rightX, ccY, { width: columnWidth, align: 'left' });
                
                i = paragraphs.length;
                continue;
            }

            if (trimmedLine === '') {
                if (!previousLineWasEmpty) doc.moveDown(0.5);
                previousLineWasEmpty = true;
                continue;
            }
            previousLineWasEmpty = false;

            // Parsear estilo dominante de la línea (marcado ligero)
            const { style, text: lineText } = parseLineStyle(trimmedLine);

            switch (style) {
                case 'bold':
                    doc.moveDown(0.3);
                    doc.font(fontBold).fontSize(13);
                    doc.text(lineText, { align: 'left' });
                    doc.font(fontRegular).fontSize(12);
                    break;

                case 'italic':
                    doc.font(fontItalic).fontSize(12);
                    doc.text(lineText, { align: 'justify' });
                    doc.font(fontRegular).fontSize(12);
                    break;

                case 'underline':
                    doc.font(fontRegular).fontSize(12);
                    doc.text(lineText, { align: 'justify', underline: true });
                    break;

                case 'bullet':
                    doc.font(fontRegular).fontSize(12);
                    doc.text(`  \u2022  ${lineText}`, { indent: 10, align: 'justify' });
                    break;

                case 'normal':
                default:
                    doc.font(fontRegular).fontSize(12);
                    doc.text(lineText, { align: 'justify' });
                    break;
            }
        }

        doc.end();

        // 7. Esperar a que el PDF se escriba y LUEGO guardar en historial
        writeStream.on('finish', async () => {
            try {
                const usuario_nombre = req.context.nombre || 'Sistema';

                // Construir valores del INSERT
                const insertValues: any = {
                    empresa_id: empresaId,
                    empleado_id: empleado_id,
                    tipo_contrato: TIPO_CONTRATO || 'DESCONOCIDO',
                    fecha_inicio: new Date(FECHA_INICIO),
                    fecha_fin: FECHA_FIN ? new Date(FECHA_FIN) : null,
                    duracion_contrato: DURACION_CONTRATO || null,
                    cargo: empleado.cargo || null,
                    salario: empleado.salario_base || null,
                    file_name: fileName,
                    file_path: filePath,
                    contrato_details: JSON.stringify(contrato_details),
                    contrato_template: templateOriginal,
                    usuario_id: usuarioId || null,
                    usuario_nombre: usuario_nombre
                };

                const insertResult = await db.insertInto('contratos')
                    .values(insertValues)
                    .returning('id')
                    .executeTakeFirst();

                if (!insertResult) {
                    console.error('❌ INSERT en contratos no retornó ID');
                    return res.status(500).json({ 
                        error: 'El contrato PDF se generó pero no se pudo guardar en el historial.',
                        url: `/api/contratos/download/${fileName}`,
                        file_name: fileName
                    });
                }

                console.log(`✅ Contrato historial guardado: ${insertResult.id} | empleado: ${empleado_id}`);

                res.json({ 
                    success: true, 
                    message: 'Contrato generado y guardado en historial correctamente',
                    url: `/api/contratos/download/${fileName}`,
                    file_name: fileName,
                    contrato_id: insertResult.id
                });
            } catch (dbErr: any) {
                console.error('❌ Error guardando contrato en historial:', dbErr.message || dbErr);

                // FIX BUG 1: No enmascarar el error - reportarlo correctamente
                res.status(500).json({ 
                    error: `Contrato PDF generado pero error al guardar historial: ${dbErr.message || 'Error de base de datos'}`,
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

// ==================== DOWNLOAD ====================

router.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const filePath = path.join(storageDir, safeFilename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send('Archivo no encontrado');
    }
});

// ==================== HISTORIAL ====================

router.get('/historial/:empleado_id', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req, res) => {
    try {
        const { empleado_id } = req.params;
        const { empresaId } = req.context;
        
        const historial = await db.selectFrom('contratos')
            .selectAll()
            .where('empleado_id', '=', empleado_id)
            .where('empresa_id', '=', empresaId)
            .orderBy('created_at', 'desc')
            .execute();

        const result = historial.map(c => ({
            ...c,
            contrato_details: c.contrato_details ? (typeof c.contrato_details === 'string' ? JSON.parse(c.contrato_details as string) : c.contrato_details) : {},
            contrato_template: (c as any).contrato_template || null
        }));

        res.json(result);
    } catch (error: any) {
        console.error('Error obteniendo historial de contratos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ELIMINAR CONTRATO ====================

router.delete('/:id', verificarAutenticacion, verificarPermiso('nomina.gestion'), async (req, res) => {
    try {
        const { id } = req.params;
        const { empresaId } = req.context;

        const contrato = await db.selectFrom('contratos')
            .select('file_path')
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();

        if (!contrato) {
            return res.status(404).json({ error: 'Contrato no encontrado' });
        }

        if (contrato.file_path && fs.existsSync(contrato.file_path)) {
            try {
                fs.unlinkSync(contrato.file_path);
            } catch (err) {
                console.error('Error al borrar el archivo físico del contrato:', err);
            }
        }

        await db.deleteFrom('contratos')
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();

        res.json({ success: true, message: 'Contrato eliminado correctamente' });
    } catch (error: any) {
        console.error('Error al eliminar contrato:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
