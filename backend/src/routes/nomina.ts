import express from 'express';
import { db } from '../database/init';
import { verificarAutenticacion as verifyToken, verificarPermiso as checkPermission } from '../middleware/authMiddleware';
import { ConfiguracionNomina, Empleado, NominaDetalle, PagoNomina, HistorialNomina } from '../models';
import { NominaService } from '../services/NominaService';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/nomina/configuracion
 * Obtener configuración actual vigente
 */
router.get('/configuracion', verifyToken, checkPermission('nomina.gestion'), (req, res) => {
  const sql = `SELECT * FROM configuracion_nomina WHERE vigente = 1 ORDER BY id DESC LIMIT 1`;
  
  db.get(sql, [], (err, row) => {
    if (err) {
      console.error('Error al obtener configuración de nómina:', err);
      return res.status(500).json({ error: 'Error al obtener configuración' });
    }
    
    if (!row) {
        // Si no existe configuración vigente, devolver un default vacío
        // Esto permite que el frontend muestre el formulario sin error 404
        return res.json({
          anio: new Date().getFullYear(),
          salario_minimo: 0,
          auxilio_transporte: 0,
          uvt: 0,
          porc_salud_empleado: 0,
          porc_pension_empleado: 0,
          fondo_solidaridad_limite: 0,
          porc_salud_empleador: 0,
          porc_pension_empleador: 0,
          porc_caja_comp: 0,
          porc_sena: 0,
          porc_icbf: 0,
          porc_cesantias: 0,
          porc_intereses_cesantias: 0,
          porc_prima: 0,
          porc_vacaciones: 0,
          porc_recargo_dominical: 75,
          porc_recargo_festivo: 75,
          porc_extra_diurna_dominical: 100,
          horas_mensuales: 240,
          vigente: false
        });
    }
    
    res.json(row);
  });
});

/**
 * PUT /api/nomina/configuracion
 * Actualizar configuración (Crear nueva versión vigente)
 */
router.put('/configuracion', verifyToken, checkPermission('nomina.gestion'), (req, res) => {
  const config = req.body as Partial<ConfiguracionNomina>;
  
  // 1. Desactivar la configuración anterior
  db.run(`UPDATE configuracion_nomina SET vigente = 0 WHERE vigente = 1`, [], (err) => {
      if(err) {
           console.error('Error desactivando config anterior:', err);
           return res.status(500).json({ error: 'Error actualizando configuración' });
      }

      // 2. Insertar nueva configuración
      const sql = `
        INSERT INTO configuracion_nomina (
          anio, salario_minimo, auxilio_transporte, uvt,
          porc_salud_empleado, porc_pension_empleado, fondo_solidaridad_limite,
          porc_salud_empleador, porc_pension_empleador, porc_caja_comp, porc_sena, porc_icbf,
          porc_cesantias, porc_intereses_cesantias, porc_prima, porc_vacaciones,
          porc_recargo_dominical, porc_recargo_festivo, porc_extra_diurna_dominical, horas_mensuales,
          vigente
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `;
      
      const params = [
        config.anio || new Date().getFullYear(),
        config.salario_minimo, config.auxilio_transporte, config.uvt,
        config.porc_salud_empleado, config.porc_pension_empleado, config.fondo_solidaridad_limite,
        config.porc_salud_empleador, config.porc_pension_empleador, config.porc_caja_comp, config.porc_sena, config.porc_icbf,
        config.porc_cesantias, config.porc_intereses_cesantias, config.porc_prima, config.porc_vacaciones,
        config.porc_recargo_dominical || 75, config.porc_recargo_festivo || 75, config.porc_extra_diurna_dominical || 100, config.horas_mensuales || 240
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          console.error('Error al crear nueva configuración de nómina:', err);
          return res.status(500).json({ error: 'Error al guardar configuración' });
        }
        
        db.get(`SELECT * FROM configuracion_nomina WHERE id = ?`, [this.lastID], (err, row) => {
             if(err) return res.json({ message: "Configuración guardada", id: this.lastID });
             res.json(row);
        });
      });
  });
});

/**
 * POST /api/nomina/calcular
 * Calcular pre-nómina para un empleado (o todos)
 */
router.post('/calcular', verifyToken, checkPermission('nomina.gestion'), async (req, res) => {
    const { empleado_id, dias_trabajados } = req.body;

    try {
        // 1. Obtener Configuración Vigente
        const config: ConfiguracionNomina = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM configuracion_nomina WHERE vigente = 1", (err, row: any) => {
                if(err) reject(err); else resolve(row);
            });
        });

        if (!config) return res.status(400).json({ error: 'No hay configuración de nómina vigente' });

        // 2. Obtener Empleado
        const empleado: Empleado = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM empleados WHERE id = ?", [empleado_id], (err, row: any) => {
                if(err) reject(err); else resolve(row);
            });
        });

        if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

        const { 
            dias_trabajados, 
            horas_dominicales_diurnas, 
            horas_festivas_diurnas, 
            horas_extra_diurna_dominical, 
            comisiones, 
            otras_deducciones,
            periodo_mes,
            periodo_anio,
            usuario_nombre 
        } = req.body;

        // 3. Calcular
        const nominaCalculada = await NominaService.calcularNominaEmpleado(
            empleado, 
            dias_trabajados || 30, 
            config,
            {
                horas_dominicales_diurnas,
                horas_festivas_diurnas,
                horas_extra_diurna_dominical,
                comisiones,
                otras_deducciones,
                periodo_mes,
                periodo_anio,
                usuario_nombre
            }
        );
        
        res.json(nominaCalculada);

    } catch (error: any) {
        console.error('Error calculando nómina:', error);
        res.status(500).json({ error: error.message || 'Error interno' });
    }
});

/**
 * POST /api/nomina/liquidacion/calcular
 * Calcular liquidación de un empleado
 */
router.post('/liquidacion/calcular', verifyToken, checkPermission('nomina.gestion'), async (req, res) => {
    const { empleado_id, fecha_retiro, motivo_retiro, base_liquidacion_manual } = req.body;

    try {
        // 1. Obtener Configuración
        const config: ConfiguracionNomina = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM configuracion_nomina WHERE vigente = 1", (err, row: any) => {
                if(err) reject(err); else resolve(row);
            });
        });

        if (!config) return res.status(400).json({ error: 'No hay configuración de nómina vigente' });

        // 2. Obtener Empleado
        const empleado: Empleado = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM empleados WHERE id = ?", [empleado_id], (err, row: any) => {
                if(err) reject(err); else resolve(row);
            });
        });

        if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

        // 3. Calcular
        const liquidacion = await NominaService.calcularLiquidacion(
            empleado, 
            fecha_retiro ? new Date(fecha_retiro) : new Date(), 
            config, 
            motivo_retiro || 'RENUNCIA_VOLUNTARIA',
            {
                baseLiquidacionManual: base_liquidacion_manual,
                diasVacacionesPendientes: req.body.dias_vacaciones,
                diasPrimaPendientes: req.body.dias_prima,
                diasCesantiasPendientes: req.body.dias_cesantias,
                salarioEsFijo: req.body.salario_fijo !== false,
                promedio12Meses: req.body.promedio_12_meses,
                incluirAuxilioTransporte: req.body.incluir_auxilio_transporte,
                diasSueldoPendientes: req.body.dias_sueldo_pendientes
            }
        );

        // 4. Guardar Auditoría (Trazabilidad obligatoria)
        const usuario_nombre = (req as any).user?.usuario || 'Sistema';

        await new Promise<void>((resolve, reject) => {
            db.run(`
                INSERT INTO historial_liquidaciones (
                    empleado_id, fecha_liquidacion, fecha_inicio_contrato, fecha_fin_contrato,
                    tipo_contrato, tipo_terminacion, salario_fijo, base_calculo,
                    base_calculo_detalle, dias_laborados, cesantias, intereses_cesantias,
                    prima_servicios, vacaciones, indemnizacion, total_liquidacion,
                    usuario_genero, version_normativa
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                empleado.id, 
                new Date().toISOString(),
                (liquidacion.fecha_inicio_contrato as any) ? new Date(liquidacion.fecha_inicio_contrato).toISOString() : empleado.fecha_inicio,
                (liquidacion.fecha_fin_contrato as any) ? new Date(liquidacion.fecha_fin_contrato).toISOString() : liquidacion.fecha_fin_contrato,
                empleado.tipo_contrato,
                motivo_retiro || 'RENUNCIA_VOLUNTARIA',
                empleado.salario_integral ? 0 : 1,
                liquidacion.base_liquidacion,
                JSON.stringify(liquidacion.detalles || {}),
                liquidacion.dias_laborados_total,
                liquidacion.cesantias,
                liquidacion.intereses_cesantias,
                liquidacion.prima_servicios,
                liquidacion.vacaciones,
                liquidacion.indemnizacion || 0,
                liquidacion.total_liquidacion,
                usuario_nombre,
                '2026-Colombia'
            ], (err) => {
                if (err) {
                    console.error('Error guardando auditoría de liquidación:', err);
                    // No rechazamos, solo log
                    resolve();
                } else {
                    resolve();
                }
            });
        });
        
        // Adjuntar datos de usuario para el PDF posterior
        (liquidacion as any).usuario_genero = usuario_nombre;
        
        res.json(liquidacion);

    } catch (error: any) {
        console.error('Error calculando liquidación:', error);
        res.status(500).json({ error: error.message || 'Error interno' });
    }
});

/**
 * POST /api/nomina/generar-pdf-preview
 * Generar preview de colilla PDF sin guardar
 */
router.post('/generar-pdf-preview', verifyToken, checkPermission('nomina.gestion'), async (req, res) => {
    const { nomina_detalle } = req.body;
    
    try {
        // Mock config for now or fetch
        const config: ConfiguracionNomina = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM configuracion_nomina WHERE vigente = 1", (err, row: any) => {
                if(err) reject(err); else resolve(row);
            });
        });

        // Necesitamos el objeto empleado completo dentro de nomina_detalle
        if(nomina_detalle.empleado_id && !nomina_detalle.empleado) {
             const empleado: Empleado = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM empleados WHERE id = ?", [nomina_detalle.empleado_id], (err, row: any) => {
                    if(err) reject(err); else resolve(row);
                });
            });
            nomina_detalle.empleado = empleado;
        }

        const pdfBuffer = await NominaService.generarPDFNomina(nomina_detalle, config);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=preview_nomina.pdf');
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Error generando PDF:', error);
        res.status(500).json({ error: 'Error generando PDF' });
    }
});

/**
 * POST /api/nomina/detalle/guardar
 * Calcula y guarda una nómina mensual (versionada) para un empleado
 */
router.post('/detalle/guardar', verifyToken, checkPermission('nomina.gestion'), async (req, res) => {
    const { empleado_id } = req.body;

    try {
        const config: ConfiguracionNomina = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM configuracion_nomina WHERE vigente = 1", (err, row: any) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!config) return res.status(400).json({ error: 'No hay configuración de nómina vigente' });

        const empleado: Empleado = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM empleados WHERE id = ?", [empleado_id], (err, row: any) => {
                if (err) reject(err); else resolve(row);
            });
        });

        if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

        const {
            dias_trabajados,
            horas_dominicales_diurnas,
            horas_festivas_diurnas,
            horas_extra_diurna_dominical,
            comisiones,
            otras_deducciones,
            periodo_mes,
            periodo_anio
        } = req.body;

        const usuario_nombre = (req as any).user?.usuario || req.body.usuario_nombre || 'Sistema';

        const nominaCalculada = await NominaService.calcularNominaEmpleado(
            empleado,
            dias_trabajados || 30,
            config,
            {
                horas_dominicales_diurnas,
                horas_festivas_diurnas,
                horas_extra_diurna_dominical,
                comisiones,
                otras_deducciones,
                periodo_mes,
                periodo_anio,
                usuario_nombre
            }
        );

        // --- VALIDACIÓN DE CAMBIOS (VERSIONADO) ---
        const latestNomina: any = await new Promise((resolve) => {
            db.get(
                `SELECT * FROM nomina_detalles 
                 WHERE empleado_id = ? AND periodo_mes = ? AND periodo_anio = ? 
                 ORDER BY version DESC LIMIT 1`,
                [empleado.id, periodo_mes, periodo_anio],
                (err, row) => resolve(row || null)
            );
        });

        if (latestNomina) {
            // Comparar valores clave (con margen de error para flotantes)
            // Usamos || 0 porque NominaService devuelve Partial<NominaDetalle>
            const isSameCalculation = 
                Math.abs((latestNomina.total_devengado || 0) - (nominaCalculada.total_devengado || 0)) < 0.01 &&
                Math.abs((latestNomina.total_deducciones || 0) - (nominaCalculada.total_deducciones || 0)) < 0.01 &&
                Math.abs((latestNomina.neto_pagado || 0) - (nominaCalculada.neto_pagado || 0)) < 0.01 &&
                latestNomina.dias_trabajados === nominaCalculada.dias_trabajados;

            if (isSameCalculation) {
                // Si el cálculo es idéntico, retornamos la versión existente (sin generar PDF nuevo ni versión nueva)
                const pagos: any[] = await new Promise((resolve, reject) => {
                    db.all(
                        `SELECT * FROM pagos_nomina 
                         WHERE empleado_id = ? AND periodo_mes = ? AND periodo_anio = ? 
                         ORDER BY fecha ASC`,
                        [empleado.id, periodo_mes, periodo_anio],
                        (err, rows: any[]) => {
                            if (err) reject(err);
                            else resolve(rows);
                        }
                    );
                });

                const totalPagado = pagos.reduce((acc, p) => acc + p.valor, 0);
                const saldoPendiente = (latestNomina.neto_pagado || 0) - totalPagado;

                // Asegurar que el objeto tenga el empleado poblado
                latestNomina.empleado = empleado;

                return res.json({
                    detalle: latestNomina,
                    pagos,
                    saldo_pendiente: saldoPendiente,
                    info: 'No hubo cambios en el cálculo, se mantiene la versión actual.'
                });
            }
        }

        const maxVersion: number = await new Promise((resolve) => {
            db.get(
                `SELECT MAX(version) as maxVersion 
                 FROM nomina_detalles 
                 WHERE empleado_id = ? AND periodo_mes = ? AND periodo_anio = ?`,
                [empleado.id, periodo_mes, periodo_anio],
                (err, row: any) => {
                    if (err || !row || !row.maxVersion) return resolve(0);
                    resolve(row.maxVersion || 0);
                }
            );
        });

        const newVersion = (maxVersion || 0) + 1;

        await new Promise<void>((resolve) => {
            db.run(
                `UPDATE nomina_detalles 
                 SET estado = 'AJUSTADA' 
                 WHERE empleado_id = ? AND periodo_mes = ? AND periodo_anio = ? AND estado = 'ABIERTA'`,
                [empleado.id, periodo_mes, periodo_anio],
                () => resolve()
            );
        });

        const insertDetallePromise: Promise<number> = new Promise((resolve, reject) => {
            db.run(
                `
                INSERT INTO nomina_detalles (
                  nomina_id,
                  empleado_id,
                  dias_trabajados,
                  sueldo_basico,
                  auxilio_transporte,
                  horas_extras,
                  recargos,
                  comisiones,
                  otros_devengados,
                  horas_dominicales_diurnas,
                  horas_festivas_diurnas,
                  horas_extra_diurna_dominical,
                  valor_dominicales_diurnas,
                  valor_festivas_diurnas,
                  valor_extra_diurna_dominical,
                  total_devengado,
                  salud_empleado,
                  pension_empleado,
                  fondo_solidaridad,
                  prestamos,
                  otras_deducciones,
                  total_deducciones,
                  neto_pagado,
                  valores_empresa,
                  version,
                  estado,
                  periodo_mes,
                  periodo_anio,
                  fecha_generacion,
                  usuario_nombre,
                  pdf_version,
                  pdf_path
                ) VALUES (
                  0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
              `,
                [
                    empleado.id,
                    nominaCalculada.dias_trabajados,
                    nominaCalculada.sueldo_basico,
                    nominaCalculada.auxilio_transporte,
                    nominaCalculada.horas_extras || 0,
                    nominaCalculada.recargos || 0,
                    nominaCalculada.comisiones || 0,
                    nominaCalculada.otros_devengados || 0,
                    nominaCalculada.horas_dominicales_diurnas || 0,
                    nominaCalculada.horas_festivas_diurnas || 0,
                    nominaCalculada.horas_extra_diurna_dominical || 0,
                    nominaCalculada.valor_dominicales_diurnas || 0,
                    nominaCalculada.valor_festivas_diurnas || 0,
                    nominaCalculada.valor_extra_diurna_dominical || 0,
                    nominaCalculada.total_devengado,
                    nominaCalculada.salud_empleado,
                    nominaCalculada.pension_empleado,
                    nominaCalculada.fondo_solidaridad || 0,
                    nominaCalculada.prestamos || 0,
                    nominaCalculada.otras_deducciones || 0,
                    nominaCalculada.total_deducciones,
                    nominaCalculada.neto_pagado,
                    nominaCalculada.valores_empresa || null,
                    newVersion,
                    'ABIERTA',
                    periodo_mes,
                    periodo_anio,
                    new Date().toISOString(),
                    usuario_nombre,
                    1,
                    null
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        const nomina_detalle_id = await insertDetallePromise;

        await new Promise<void>((resolve, reject) => {
            db.run(
                `
              INSERT INTO historial_nomina (
                nomina_detalle_id, version, fecha, cambio_realizado, usuario_nombre, payload
              ) VALUES (?, ?, ?, ?, ?, ?)
            `,
                [
                    nomina_detalle_id,
                    newVersion,
                    new Date().toISOString(),
                    newVersion === 1 ? 'Creación de nómina mensual' : 'Re-cálculo de nómina (posible adelanto/cambio)',
                    usuario_nombre,
                    JSON.stringify(nominaCalculada)
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        const nominaDetalleCompleta: NominaDetalle = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM nomina_detalles WHERE id = ?`,
                [nomina_detalle_id],
                (err, row: any) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        (nominaDetalleCompleta as any).empleado = empleado;

        const pdfBuffer = await NominaService.generarPDFNomina(nominaDetalleCompleta, config);

        const baseDir = path.join(__dirname, '../../storage/nomina_pdfs');
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }

        const safeMes = (periodo_mes || '').toString().toUpperCase().replace(/\s+/g, '');
        let fileName = `nomina_${empleado.id}_${periodo_anio}_${safeMes}_v${newVersion}.pdf`;
        let filePath = path.join(baseDir, fileName);

        // REGLA: No sobrescribir PDFs existentes. Si por alguna razón existe, agregar un timestamp único.
        if (fs.existsSync(filePath)) {
            const timestamp = new Date().getTime();
            fileName = `nomina_${empleado.id}_${periodo_anio}_${safeMes}_v${newVersion}_${timestamp}.pdf`;
            filePath = path.join(baseDir, fileName);
        }

        fs.writeFileSync(filePath, pdfBuffer);

        await new Promise<void>((resolve, reject) => {
            db.run(
                `UPDATE nomina_detalles SET pdf_version = ?, pdf_path = ? WHERE id = ?`,
                [newVersion, filePath, nomina_detalle_id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        const pagos: PagoNomina[] = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM pagos_nomina 
                 WHERE empleado_id = ? AND periodo_mes = ? AND periodo_anio = ? 
                 ORDER BY fecha_pago ASC`,
                [empleado.id, periodo_mes, periodo_anio],
                (err, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows as PagoNomina[]);
                }
            );
        });

        const totalPagado = pagos.reduce((acc, p) => acc + p.valor, 0);
        const saldoPendiente = (nominaDetalleCompleta.neto_pagado || 0) - totalPagado;

        res.json({
            detalle: nominaDetalleCompleta,
            pagos,
            saldo_pendiente: saldoPendiente
        });
    } catch (error: any) {
        console.error('Error guardando nómina:', error);
        res.status(500).json({ error: error.message || 'Error interno' });
    }
});

/**
 * POST /api/nomina/detalle/:id/pagos
 * Registrar un pago (quincena/ajuste) asociado a una nómina calculada
 */
router.post('/detalle/:id/pagos', verifyToken, checkPermission('nomina.gestion'), async (req, res) => {
    const nomina_detalle_id = parseInt(req.params.id, 10);
    const { valor, tipo, fecha, observaciones } = req.body;

    if (!valor || valor <= 0) {
        return res.status(400).json({ error: 'El valor del pago debe ser mayor a 0' });
    }

    const tipoPago = tipo || 'QUINCENA';
    const fechaPago = fecha ? new Date(fecha).toISOString() : new Date().toISOString();
    const usuario_nombre = (req as any).user?.usuario || 'Sistema';

    try {
        const nominaDetalle: NominaDetalle | undefined = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM nomina_detalles WHERE id = ?`,
                [nomina_detalle_id],
                (err, row: any) => {
                    if (err) reject(err);
                    else resolve(row || undefined);
                }
            );
        });

        if (!nominaDetalle) return res.status(404).json({ error: 'Nómina no encontrada' });

        // REGLA: No permitir pagos si no es la versión activa (ABIERTA)
        if (nominaDetalle.estado !== 'ABIERTA') {
            return res.status(400).json({ 
                error: 'No se pueden registrar pagos en una versión histórica o cerrada. Por favor use la versión activa.' 
            });
        }

        const pagoId: number = await new Promise((resolve, reject) => {
            db.run(
                `
              INSERT INTO pagos_nomina (
                nomina_detalle_id, empleado_id, periodo_mes, periodo_anio, fecha_pago, tipo, valor, usuario_nombre, observaciones
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
                [
                    nomina_detalle_id, 
                    nominaDetalle.empleado_id, 
                    nominaDetalle.periodo_mes, 
                    nominaDetalle.periodo_anio, 
                    fechaPago, 
                    tipoPago, 
                    valor, 
                    usuario_nombre, 
                    observaciones || null
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });

        // El saldo se calcula sobre la versión activa menos TODOS los pagos del periodo
        const pagos: PagoNomina[] = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM pagos_nomina 
                 WHERE empleado_id = ? AND periodo_mes = ? AND periodo_anio = ? 
                 ORDER BY fecha_pago ASC`,
                [nominaDetalle.empleado_id, nominaDetalle.periodo_mes, nominaDetalle.periodo_anio],
                (err, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows as PagoNomina[]);
                }
            );
        });

        const totalPagado = pagos.reduce((acc, p) => acc + p.valor, 0);
        const saldoPendiente = (nominaDetalle.neto_pagado || 0) - totalPagado;

        if (saldoPendiente <= 0) {
            await new Promise<void>((resolve, reject) => {
                db.run(
                    `UPDATE nomina_detalles SET estado = 'PAGADA' WHERE id = ?`,
                    [nomina_detalle_id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }

        res.json({
            pago_id: pagoId,
            pagos,
            saldo_pendiente: saldoPendiente
        });
    } catch (error: any) {
        console.error('Error registrando pago de nómina:', error);
        res.status(500).json({ error: error.message || 'Error interno' });
    }
});

/**
 * GET /api/nomina/historial
 * Historial ordenado y auditable de nómina por empleado/periodo
 */
router.get('/historial', verifyToken, checkPermission('nomina.gestion'), async (req, res) => {
    const empleado_id = parseInt(req.query.empleado_id as string, 10);
    const periodo_mes = (req.query.periodo_mes as string) || null;
    const periodo_anio = req.query.periodo_anio ? parseInt(req.query.periodo_anio as string, 10) : null;

    if (!empleado_id) {
        return res.status(400).json({ error: 'empleado_id es requerido' });
    }

    try {
        const params: any[] = [empleado_id];
        let where = 'WHERE empleado_id = ?';

        if (periodo_mes) {
            where += ' AND periodo_mes = ?';
            params.push(periodo_mes);
        }

        if (periodo_anio) {
            where += ' AND periodo_anio = ?';
            params.push(periodo_anio);
        }

        const nominas: NominaDetalle[] = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM nomina_detalles ${where} ORDER BY periodo_anio DESC, periodo_mes DESC, version DESC`,
                params,
                (err, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows as NominaDetalle[]);
                }
            );
        });

        if (nominas.length === 0) {
            return res.json({ nominas: [], pagos: [], historial: [] });
        }

        const ids = nominas.map((n) => n.id);
        const placeholders = ids.map(() => '?').join(',');

        const pagos: PagoNomina[] = await new Promise((resolve, reject) => {
            let pagosWhere = 'WHERE empleado_id = ?';
            const pagosParams: any[] = [empleado_id];
            
            if (periodo_mes) {
                pagosWhere += ' AND periodo_mes = ?';
                pagosParams.push(periodo_mes);
            }
            if (periodo_anio) {
                pagosWhere += ' AND periodo_anio = ?';
                pagosParams.push(periodo_anio);
            }

            db.all(
                `SELECT * FROM pagos_nomina ${pagosWhere} ORDER BY fecha_pago ASC`,
                pagosParams,
                (err, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows as PagoNomina[]);
                }
            );
        });

        const historial: HistorialNomina[] = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM historial_nomina WHERE nomina_detalle_id IN (${placeholders}) ORDER BY fecha ASC`,
                ids,
                (err, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows as HistorialNomina[]);
                }
            );
        });

        res.json({ nominas, pagos, historial });
    } catch (error: any) {
        console.error('Error obteniendo historial de nómina:', error);
        res.status(500).json({ error: error.message || 'Error interno' });
    }
});

/**
 * GET /api/nomina/detalle/:id/pdf
 * Descargar el PDF versionado asociado a una nómina guardada
 */
router.get('/detalle/:id/pdf', verifyToken, checkPermission('nomina.gestion'), async (req, res) => {
    const nomina_detalle_id = parseInt(req.params.id, 10);

    try {
        const detalle: NominaDetalle | undefined = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM nomina_detalles WHERE id = ?`,
                [nomina_detalle_id],
                (err, row: any) => {
                    if (err) reject(err);
                    else resolve(row || undefined);
                }
            );
        });

        if (!detalle || !detalle.pdf_path) {
            return res.status(404).json({ error: 'PDF de nómina no encontrado' });
        }

        if (!fs.existsSync(detalle.pdf_path)) {
            return res.status(404).json({ error: 'Archivo PDF no disponible en disco' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=nomina_${detalle.empleado_id}_${detalle.periodo_anio}_${detalle.periodo_mes}_v${detalle.version || 1}.pdf`
        );
        const stream = fs.createReadStream(detalle.pdf_path);
        stream.pipe(res);
    } catch (error: any) {
        console.error('Error descargando PDF de nómina:', error);
        res.status(500).json({ error: error.message || 'Error interno' });
    }
});

/**
 * POST /api/nomina/liquidacion/pdf-preview
 * Generar preview de liquidación en PDF
 */
router.post('/liquidacion/pdf-preview', verifyToken, checkPermission('nomina.gestion'), async (req, res) => {
    const { liquidacion } = req.body;
    
    try {
        if (!liquidacion || !liquidacion.empleado_id) {
            return res.status(400).json({ error: 'Datos de liquidación incompletos' });
        }

        // Obtener Empleado
        const empleado: Empleado = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM empleados WHERE id = ?", [liquidacion.empleado_id], (err, row: any) => {
                if(err) reject(err); else resolve(row);
            });
        });

        if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

        const pdfBuffer = await NominaService.generarPDFLiquidacion(liquidacion, empleado);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=liquidacion.pdf');
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Error generando PDF de liquidación:', error);
        res.status(500).json({ error: 'Error generando PDF' });
    }
});

export default router;
