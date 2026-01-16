import { db } from '../database/init';
import { Empleado, ConfiguracionNomina, NominaDetalle } from '../models';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export class NominaService {
    
    /**
     * Calcula la nómina para un empleado en un periodo
     */
    static async calcularNominaEmpleado(
        empleado: Empleado, 
        diasTrabajados: number, 
        config: ConfiguracionNomina,
        extraData: {
            horas_dominicales_diurnas?: number;
            horas_festivas_diurnas?: number;
            horas_extra_diurna_dominical?: number;
            otras_deducciones?: number; // Para adelantos/préstamos
            comisiones?: number;
            periodo_mes?: string;
            periodo_anio?: number;
            usuario_nombre?: string;
        } = {}
    ): Promise<Partial<NominaDetalle>> {
        
        // 1. Calcular Devengados
        // Sueldo Básico proporcional a días trabajados (sobre base de 30 días)
        const sueldoBasico = Math.round((empleado.salario_base / 30) * diasTrabajados);
        
        const valorHora = empleado.salario_base / config.horas_mensuales;

        const horasDom = extraData.horas_dominicales_diurnas || 0;
        const horasFest = extraData.horas_festivas_diurnas || 0;
        const horasExtraDom = extraData.horas_extra_diurna_dominical || 0;

        const valorDominicales = Math.round(horasDom * valorHora * (1 + (config.porc_recargo_dominical / 100)));
        const valorFestivas = Math.round(horasFest * valorHora * (1 + (config.porc_recargo_festivo / 100)));
        const valorExtraDom = Math.round(horasExtraDom * valorHora * (1 + (config.porc_extra_diurna_dominical / 100)));

        let auxilioTransporte = 0;
        if (empleado.auxilio_transporte && empleado.salario_base <= (config.salario_minimo * 2)) {
            auxilioTransporte = Math.round((config.auxilio_transporte / 30) * diasTrabajados);
        }

        const comisiones = Math.round(extraData.comisiones || 0);
        const totalDevengado = sueldoBasico + auxilioTransporte + valorDominicales + valorFestivas + valorExtraDom + comisiones;

        // 2. Calcular Deducciones (Salud y Pension)
        let baseCotizacion = totalDevengado - auxilioTransporte;
        
        if (empleado.salario_integral) {
            baseCotizacion = totalDevengado * 0.7;
        }

        const saludEmpleado = Math.round(baseCotizacion * (config.porc_salud_empleado / 100));
        const pensionEmpleado = Math.round(baseCotizacion * (config.porc_pension_empleado / 100));

        let fondoSolidaridad = 0;
        if (baseCotizacion > config.fondo_solidaridad_limite) {
             fondoSolidaridad = Math.round(baseCotizacion * 0.01);
        }

        const otrasDeducciones = Math.round(extraData.otras_deducciones || 0);
        const totalDeducciones = saludEmpleado + pensionEmpleado + fondoSolidaridad + otrasDeducciones;

        // 3. Neto
        const netoPagado = totalDevengado - totalDeducciones;

        // 4. Costos Empresa
        let exonerado = false;
        if (totalDevengado < (config.salario_minimo * 10)) {
            exonerado = true;
        }

        const saludEmpleador = exonerado ? 0 : baseCotizacion * (config.porc_salud_empleador / 100);
        const pensionEmpleador = baseCotizacion * (config.porc_pension_empleador / 100);
        const cajaCompensacion = totalDevengado * (config.porc_caja_comp / 100);
        const baseParafiscales = totalDevengado - auxilioTransporte; 
        
        const sena = exonerado ? 0 : baseParafiscales * (config.porc_sena / 100);
        const icbf = exonerado ? 0 : baseParafiscales * (config.porc_icbf / 100);

        const porcArl = empleado.alto_riesgo ? 6.960 : 0.522; 
        const arl = baseCotizacion * (porcArl / 100);
        
        const cesantias = totalDevengado * (config.porc_cesantias / 100);
        const interesesCesantias = cesantias * (config.porc_intereses_cesantias / 100);
        const prima = totalDevengado * (config.porc_prima / 100);
        const vacaciones = sueldoBasico * (config.porc_vacaciones / 100);

        const valoresEmpresa = {
            salud: saludEmpleador,
            pension: pensionEmpleador,
            arl: arl,
            caja: cajaCompensacion,
            sena: sena,
            icbf: icbf,
            provisiones: {
                cesantias,
                interesesCesantias,
                prima,
                vacaciones
            }
        };

        return {
            empleado_id: empleado.id,
            dias_trabajados: diasTrabajados,
            sueldo_basico: sueldoBasico,
            auxilio_transporte: auxilioTransporte,
            horas_extras: horasExtraDom, 
            recargos: valorDominicales + valorFestivas,
            horas_dominicales_diurnas: horasDom,
            horas_festivas_diurnas: horasFest,
            horas_extra_diurna_dominical: horasExtraDom,
            valor_dominicales_diurnas: valorDominicales,
            valor_festivas_diurnas: valorFestivas,
            valor_extra_diurna_dominical: valorExtraDom,
            comisiones: comisiones,
            otros_devengados: 0,
            total_devengado: totalDevengado,
            salud_empleado: saludEmpleado,
            pension_empleado: pensionEmpleado,
            fondo_solidaridad: fondoSolidaridad,
            prestamos: otrasDeducciones, 
            otras_deducciones: otrasDeducciones,
            total_deducciones: totalDeducciones,
            neto_pagado: netoPagado,
            valores_empresa: JSON.stringify(valoresEmpresa),
            periodo_mes: extraData.periodo_mes,
            periodo_anio: extraData.periodo_anio,
            usuario_nombre: extraData.usuario_nombre,
            fecha_generacion: new Date()
        };
    }

    /**
     * Generar PDF de colilla de pago
     */
    static async generarPDFNomina(nominaDetalle: NominaDetalle, config: ConfiguracionNomina): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            db.get('SELECT * FROM config_facturacion ORDER BY id DESC LIMIT 1', [], (err, emp: any) => {
                const empresa = emp || { nombre_empresa: 'CASA MONTIS', nit: 'N/A', direccion: 'N/A' };
                
                // Encabezado Compartido
                this.dibujarHeaderEmpresa(doc, empresa);
                doc.fontSize(14).font('Helvetica-Bold').text('COMPROBANTE DE NÓMINA', { align: 'center' });
                doc.moveDown(0.5);

                // Información Empleado
                if (nominaDetalle.empleado) {
                    const e = nominaDetalle.empleado;
                    doc.fontSize(10).font('Helvetica');
                    doc.text(`Empleado: ${e.nombres} ${e.apellidos}`);
                    doc.text(`Documento: ${e.numero_documento}`);
                    doc.text(`Cargo: ${e.cargo}`);
                    doc.text(`Salario Base: $${Math.round(e.salario_base).toLocaleString('es-CO')}`);
                }
                doc.moveDown(0.5);
                
                doc.text(`Días Trabajados: ${nominaDetalle.dias_trabajados}`);
                doc.moveDown();

                const tableTop = doc.y;
                const col1 = 50; const col2 = 250;
                
                doc.fontSize(12).text('DEVENGADOS', col1, tableTop, { underline: true });
                doc.text('DEDUCCIONES', col2, tableTop, { underline: true });
                doc.moveDown();
                
                let y = doc.y;
                doc.fontSize(10);
                
                // Devengados
                doc.text('Sueldo Básico:', col1, y);
                doc.text(`$${Math.round(nominaDetalle.sueldo_basico).toLocaleString('es-CO')}`, col1 + 100, y, { align: 'right', width: 80 });
                y += 15;
                
                if (nominaDetalle.auxilio_transporte > 0) {
                    doc.text('Aux. Transporte:', col1, y);
                    doc.text(`$${Math.round(nominaDetalle.auxilio_transporte).toLocaleString('es-CO')}`, col1 + 100, y, { align: 'right', width: 80 });
                    y += 15;
                }

                if (nominaDetalle.valor_dominicales_diurnas && nominaDetalle.valor_dominicales_diurnas > 0) {
                    doc.text(`Rec. Dominical (${Math.round(nominaDetalle.horas_dominicales_diurnas || 0)}h):`, col1, y);
                    doc.text(`$${Math.round(nominaDetalle.valor_dominicales_diurnas).toLocaleString('es-CO')}`, col1 + 100, y, { align: 'right', width: 80 });
                    y += 15;
                }

                if (nominaDetalle.valor_festivas_diurnas && nominaDetalle.valor_festivas_diurnas > 0) {
                    doc.text(`Rec. Festivo (${Math.round(nominaDetalle.horas_festivas_diurnas || 0)}h):`, col1, y);
                    doc.text(`$${Math.round(nominaDetalle.valor_festivas_diurnas).toLocaleString('es-CO')}`, col1 + 100, y, { align: 'right', width: 80 });
                    y += 15;
                }

                if (nominaDetalle.valor_extra_diurna_dominical && nominaDetalle.valor_extra_diurna_dominical > 0) {
                    doc.text(`H. Extra Dom (${Math.round(nominaDetalle.horas_extra_diurna_dominical || 0)}h):`, col1, y);
                    doc.text(`$${Math.round(nominaDetalle.valor_extra_diurna_dominical).toLocaleString('es-CO')}`, col1 + 100, y, { align: 'right', width: 80 });
                    y += 15;
                }

                if (nominaDetalle.comisiones > 0) {
                    doc.text('Comisiones:', col1, y);
                    doc.text(`$${Math.round(nominaDetalle.comisiones).toLocaleString('es-CO')}`, col1 + 100, y, { align: 'right', width: 80 });
                    y += 15;
                }
                
                doc.font('Helvetica-Bold').text('TOTAL DEVENGADO:', col1, y + 10);
                doc.text(`$${Math.round(nominaDetalle.total_devengado).toLocaleString('es-CO')}`, col1 + 100, y + 10, { align: 'right', width: 80 });
                doc.font('Helvetica');

                // Deducciones
                let y2 = tableTop + 25;
                doc.text('Salud (4%):', col2, y2);
                doc.text(`$${Math.round(nominaDetalle.salud_empleado).toLocaleString('es-CO')}`, col2 + 100, y2, { align: 'right', width: 80 });
                y2 += 15;
                
                doc.text('Pensión (4%):', col2, y2);
                doc.text(`$${Math.round(nominaDetalle.pension_empleado).toLocaleString('es-CO')}`, col2 + 100, y2, { align: 'right', width: 80 });
                y2 += 15;
                
                if (nominaDetalle.otras_deducciones && nominaDetalle.otras_deducciones > 0) {
                    doc.text('Otros (Adelantos):', col2, y2);
                    doc.text(`$${Math.round(nominaDetalle.otras_deducciones).toLocaleString('es-CO')}`, col2 + 100, y2, { align: 'right', width: 80 });
                    y2 += 15;
                }
                
                doc.font('Helvetica-Bold').text('TOTAL DEDUCCIONES:', col2, y2 + 10);
                doc.text(`$${Math.round(nominaDetalle.total_deducciones).toLocaleString('es-CO')}`, col2 + 100, y2 + 10, { align: 'right', width: 80 });
                doc.font('Helvetica');

                const finalY = Math.max(y + 30, y2 + 30);
                doc.y = finalY;

                // Trazabilidad
                doc.moveDown(1);
                doc.fontSize(8).font('Helvetica-Oblique');
                doc.text(`Periodo: ${nominaDetalle.periodo_mes || 'N/A'} ${nominaDetalle.periodo_anio || ''}`, 50);
                doc.text(`Generado el: ${new Date(nominaDetalle.fecha_generacion || Date.now()).toLocaleString()}`, 50);
                doc.text(`Calculado por: ${nominaDetalle.usuario_nombre || 'Sistema'}`, 50);
                
                // NETO
                doc.moveDown(4);
                doc.fontSize(14).font('Helvetica-Bold').text(`NETO A PAGAR: $${Math.round(nominaDetalle.neto_pagado).toLocaleString('es-CO')}`, { align: 'center' });
                doc.font('Helvetica');

                // Firmas
                doc.moveDown(4);
                const firmaY = doc.y;
                doc.moveTo(50, firmaY).lineTo(200, firmaY).stroke();
                doc.text('Firma Empleador', 50, firmaY + 5, { width: 150, align: 'center' });
                
                doc.moveTo(350, firmaY).lineTo(500, firmaY).stroke();
                doc.text('Firma Empleado', 350, firmaY + 5, { width: 150, align: 'center' });

                doc.end();
            });
        });
    }

    /**
     * Generar PDF de liquidación (Colombia - Reforzado)
     */
    static async generarPDFLiquidacion(liquidacion: any, empleado: Empleado): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40 });
            const buffers: Buffer[] = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            db.get('SELECT * FROM config_facturacion ORDER BY id DESC LIMIT 1', [], (err, emp: any) => {
                const empresa = emp || { nombre_empresa: 'CASA MONTIS', nit: 'N/A', direccion: 'N/A' };

                // Header Estandarizado
                this.dibujarHeaderEmpresa(doc, empresa);
                doc.fontSize(13).font('Helvetica-Bold').text('LIQUIDACIÓN DEFINITIVA DE PRESTACIONES SOCIALES', { align: 'center', underline: true });
                doc.moveDown(0.5);

                // Información General
                doc.fontSize(9).font('Helvetica-Bold');
                const colA = 40; const colB = 300;
                let currentY = doc.y;

                doc.text('INFORMACIÓN DEL TRABAJADOR', colA, currentY);
                doc.text('INFORMACIÓN DEL CONTRATO', colB, currentY);
                currentY += 15;
                doc.font('Helvetica').fontSize(8);
                
                doc.text(`Nombre: ${empleado.nombres} ${empleado.apellidos}`, colA, currentY);
                doc.text(`Contrato: ${liquidacion.tipo_contrato}`, colB, currentY);
                currentY += 12;
                doc.text(`Documento: ${empleado.numero_documento}`, colA, currentY);
                doc.text(`Motivo: ${liquidacion.motivo_retiro.replace(/_/g, ' ')}`, colB, currentY);
                currentY += 12;
                doc.text(`Cargo: ${empleado.cargo}`, colA, currentY);
                doc.text(`Fecha Ingreso: ${new Date(liquidacion.fecha_inicio_contrato).toLocaleDateString()}`, colB, currentY);
                currentY += 12;
                doc.text(`Salario Base: $${Math.round(liquidacion.bases.salario_base).toLocaleString()}`, colA, currentY);
                doc.text(`Fecha Retiro: ${new Date(liquidacion.fecha_fin_contrato).toLocaleDateString()}`, colB, currentY);
                currentY += 12;
                doc.text(`Base Prestaciones: $${Math.round(liquidacion.bases.base_prestaciones).toLocaleString()}`, colA, currentY);
                doc.text(`Días Laborados: ${liquidacion.dias_laborados_total}`, colB, currentY);
                
                doc.moveDown(2);
                currentY = doc.y;

                const drawRow = (label: string, formula: string, value: number, dias?: number) => {
                    doc.font('Helvetica-Bold').fontSize(9).text(label, colA, currentY);
                    doc.font('Helvetica').fontSize(8).text(formula + (dias ? ` [Días: ${dias}]` : ''), colA + 20, currentY + 12);
                    doc.font('Helvetica-Bold').fontSize(9).text(`$${Math.round(value).toLocaleString()}`, 450, currentY, { align: 'right', width: 100 });
                    currentY += 30;
                };

                const d = liquidacion.detalles;
                drawRow('CESANTÍAS', d.cesantias.formula, d.cesantias.valor, d.cesantias.dias);
                drawRow('INTERESES CESANTÍAS', d.intereses.formula, d.intereses.valor);
                drawRow('PRIMA DE SERVICIOS', d.prima.formula, d.prima.valor, d.prima.dias);
                drawRow('VACACIONES', d.vacaciones.formula, d.vacaciones.valor, d.vacaciones.dias);
                
                if (d.indemnizacion.valor > 0) {
                    drawRow('INDEMNIZACIÓN', `Legal (Motivo: ${d.indemnizacion.motivo})`, d.indemnizacion.valor);
                }

                if (d.salario_pendiente.valor_bruto > 0) {
                    currentY += 10;
                    doc.font('Helvetica-Bold').fontSize(9).text('SALARIO PENDIENTE Y DEDUCCIONES', colA, currentY);
                    currentY += 15;
                    const sp = d.salario_pendiente;
                    doc.font('Helvetica').fontSize(8);
                    doc.text(`Sueldo (${sp.dias} días a $${sp.valor_dia.toLocaleString()})`, colA + 20, currentY);
                    doc.text(`$${sp.valor_bruto.toLocaleString()}`, 450, currentY, { align: 'right', width: 100 });
                    currentY += 12;
                    if (sp.aux_transporte > 0) {
                        doc.text('Auxilio de Transporte Proporcional', colA + 20, currentY);
                        doc.text(`$${sp.aux_transporte.toLocaleString()}`, 450, currentY, { align: 'right', width: 100 });
                        currentY += 12;
                    }
                    doc.font('Helvetica-Oblique').text('Dcto. Salud (4%)', colA + 20, currentY);
                    doc.text(`- $${sp.salud.toLocaleString()}`, 450, currentY, { align: 'right', width: 100 });
                    currentY += 12;
                    doc.text('Dcto. Pensión (4%)', colA + 20, currentY);
                    doc.text(`- $${sp.pension.toLocaleString()}`, 450, currentY, { align: 'right', width: 100 });
                    currentY += 15;
                }

                doc.moveTo(colA, currentY).lineTo(550, currentY).stroke();
                currentY += 10;
                doc.font('Helvetica-Bold').fontSize(12).text('TOTAL A PAGAR:', colA, currentY);
                doc.text(`$${Math.round(liquidacion.total_liquidacion).toLocaleString()}`, 400, currentY, { align: 'right', width: 150 });
                
                currentY += 40;
                doc.font('Helvetica-Oblique').fontSize(7).text(`Generado por: ${liquidacion.usuario_genero || 'Sistema'} | Fecha Sistema: ${new Date().toLocaleString()} | Normativa: ${liquidacion.version_normativa}`, colA, currentY);
                
                currentY += 20;
                doc.font('Helvetica-Bold').fontSize(9).text('PAZ Y SALVO Y CONFORMIDAD', colA, currentY);
                currentY += 15;
                const legalText = `Certifico que he recibido a satisfacción la suma de $${Math.round(liquidacion.total_liquidacion).toLocaleString()} pesos colombianos, por concepto de mi liquidación definitiva de contrato. Con este pago me declaro a paz y salvo con ${empresa.nombre_empresa} por todo concepto laboral (salarios, prestaciones, vacaciones, indemnizaciones y demás alcances legales).`;
                doc.font('Helvetica').fontSize(8).text(legalText, colA, currentY, { align: 'justify', width: 510 });

                currentY += 60;
                doc.moveTo(colA, currentY).lineTo(200, currentY).stroke();
                doc.text('Firma Empleador / Representante', colA, currentY + 5, { width: 160, align: 'center' });

                doc.moveTo(350, currentY).lineTo(510, currentY).stroke();
                doc.text('Firma Trabajador', 350, currentY + 5, { width: 160, align: 'center' });
                doc.text(`C.C. ${empleado.numero_documento}`, 350, currentY + 15, { width: 160, align: 'center' });

                doc.end();
            });
        });
    }

    /**
     * Calcular Liquidación de Prestaciones Sociales (Colombia)
     */
    static async calcularLiquidacion(
        empleado: Empleado, 
        fechaRetiro: Date, 
        config: ConfiguracionNomina,
        motivoRetiro: string,
        params: any = {}
    ): Promise<any> {
        const fechaInicio = new Date(empleado.fecha_inicio);
        const fechaFin = new Date(fechaRetiro);
        
        const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
        const diasLaboradosTotal = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        let baseSalarial = params.salarioEsFijo === false && params.promedio12Meses 
            ? params.promedio12Meses 
            : (params.baseLiquidacionManual || empleado.salario_base);
        
        let incluyeAuxilio = params.incluirAuxilioTransporte !== undefined
            ? params.incluirAuxilioTransporte
            : (empleado.auxilio_transporte && (baseSalarial <= (config.salario_minimo * 2)));
        
        let basePrestaciones = baseSalarial + (incluyeAuxilio ? config.auxilio_transporte : 0);
        let baseVacaciones = baseSalarial;

        const diasCesantias = params.diasCesantiasPendientes ?? this.calcularDiasProporcionalesAnio(fechaInicio, fechaFin);
        const diasPrima = params.diasPrimaPendientes ?? this.calcularDiasProporcionalesSemestre(fechaInicio, fechaFin);
        const diasVacaciones = params.diasVacacionesPendientes ?? (diasCesantias);

        const cesantias = (basePrestaciones * diasCesantias) / 360;
        const interesesCesantias = (cesantias * 0.12 * diasCesantias) / 360;
        const primaServicios = (basePrestaciones * diasPrima) / 360;
        const vacaciones = (baseVacaciones * diasVacaciones) / 720;

        let indemnizacion = 0;
        let motivoIndemnizacion = "";

        if (motivoRetiro === 'DESPIDO_SIN_JUSTA_CAUSA') {
            // REGLA PRIORITARIA: El período de prueba bloquea la indemnización (Art. 76 CST)
            const esPeriodoPruebaActivo = empleado.es_periodo_prueba && 
                                         empleado.fecha_fin_periodo_prueba && 
                                         new Date(fechaFin) <= new Date(empleado.fecha_fin_periodo_prueba);

            if (esPeriodoPruebaActivo) {
                indemnizacion = 0;
                motivoIndemnizacion = "Periodo de prueba (Art. 76 CST) - Sin indemnización";
            } else {
                const smmlv10 = config.salario_minimo * 10;
                const valorDia = baseSalarial / 30;

                if (empleado.tipo_contrato === 'INDEFINIDO') {
                    if (baseSalarial <= smmlv10) {
                        // <= 10 SMMLV: 30 días año 1 + 20 días subsiguientes (proporcional)
                        if (diasLaboradosTotal <= 360) {
                            const diasIndem = (30 * diasLaboradosTotal) / 360;
                            indemnizacion = valorDia * diasIndem;
                        } else {
                            const diasAdicionales = diasLaboradosTotal - 360;
                            const diasIndemSub = (20 * diasAdicionales) / 360;
                            indemnizacion = (valorDia * 30) + (valorDia * diasIndemSub);
                        }
                    } else {
                        // > 10 SMMLV: 20 días año 1 + 15 días subsiguientes (proporcional)
                        if (diasLaboradosTotal <= 360) {
                            const diasIndem = (20 * diasLaboradosTotal) / 360;
                            indemnizacion = valorDia * diasIndem;
                        } else {
                            const diasAdicionales = diasLaboradosTotal - 360;
                            const diasIndemSub = (15 * diasAdicionales) / 360;
                            indemnizacion = (valorDia * 20) + (valorDia * diasIndemSub);
                        }
                    }
                    motivoIndemnizacion = "Indefinido Art. 64 CST (Proporcional)";
                } else if (empleado.tipo_contrato === 'TERMINO_FIJO' && empleado.fecha_fin) {
                    // Término Fijo: Salarios faltantes hasta el plazo estipulado (Art. 64 CST)
                    const fechaVence = new Date(empleado.fecha_fin);
                    if (fechaVence > fechaFin) {
                        const diffFaltante = fechaVence.getTime() - fechaFin.getTime();
                        const diasFaltantes = Math.max(0, Math.ceil(diffFaltante / (1000 * 60 * 60 * 24)));
                        indemnizacion = valorDia * diasFaltantes;
                        motivoIndemnizacion = `Término Fijo - ${diasFaltantes} días faltantes`;
                    }
                }
            }
        }

        const diasSueldoPendientes = params.diasSueldoPendientes ?? fechaFin.getDate();
        const valorDiaSueldo = Math.floor(baseSalarial / 30);
        const salarioPendiente = valorDiaSueldo * diasSueldoPendientes;
        const auxTranspPendiente = incluyeAuxilio ? Math.floor((config.auxilio_transporte / 30) * diasSueldoPendientes) : 0;
        
        const saludPendiente = Math.round(salarioPendiente * 0.04);
        const pensionPendiente = Math.round(salarioPendiente * 0.04);
        const netoSalarioPendiente = salarioPendiente + auxTranspPendiente - saludPendiente - pensionPendiente;

        const totalLiquidacion = Math.round(cesantias) + Math.round(interesesCesantias) + Math.round(primaServicios) + Math.round(vacaciones) + Math.round(indemnizacion) + netoSalarioPendiente;

        return {
            empleado_id: empleado.id,
            fecha_inicio_contrato: fechaInicio,
            fecha_fin_contrato: fechaFin,
            tipo_contrato: empleado.tipo_contrato,
            motivo_retiro: motivoRetiro,
            dias_laborados_total: diasLaboradosTotal,
            bases: {
                salario_base: baseSalarial,
                incluye_auxilio_transporte: incluyeAuxilio,
                base_prestaciones: basePrestaciones,
                base_vacaciones: baseVacaciones,
                es_salario_variable: params.salarioEsFijo === false
            },
            detalles: {
                cesantias: { valor: Math.round(cesantias), dias: diasCesantias, formula: "(Base Prestaciones * Días) / 360" },
                intereses: { valor: Math.round(interesesCesantias), formula: "(Cesantías * 0.12 * Días) / 360" },
                prima: { valor: Math.round(primaServicios), dias: diasPrima, formula: "(Base Prestaciones * Días) / 360" },
                vacaciones: { valor: Math.round(vacaciones), dias: diasVacaciones, formula: "(Base Salarial * Días) / 720" },
                indemnizacion: { valor: Math.round(indemnizacion), motivo: motivoIndemnizacion },
                salario_pendiente: {
                    valor_bruto: salarioPendiente,
                    aux_transporte: auxTranspPendiente,
                    salud: saludPendiente,
                    pension: pensionPendiente,
                    neto: netoSalarioPendiente,
                    dias: diasSueldoPendientes,
                    valor_dia: valorDiaSueldo
                }
            },
            total_liquidacion: Math.round(totalLiquidacion),
            version_normativa: "Ley 789 de 2002 / CST"
        };
    }

    private static calcularDiasProporcionalesAnio(inicio: Date, fin: Date): number {
        const corte = new Date(fin.getFullYear(), 0, 1);
        const realInicio = inicio > corte ? inicio : corte;
        const diff = Math.abs(fin.getTime() - realInicio.getTime());
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    }

    private static calcularDiasProporcionalesSemestre(inicio: Date, fin: Date): number {
        const mesFin = fin.getMonth();
        const corte = new Date(fin.getFullYear(), mesFin < 6 ? 0 : 6, 1);
        const realInicio = inicio > corte ? inicio : corte;
        const diff = Math.abs(fin.getTime() - realInicio.getTime());
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    }

    private static dibujarHeaderEmpresa(doc: PDFKit.PDFDocument, emp: any) {
        // Nombre Empresa
        doc.fontSize(14).font('Helvetica-Bold').text(emp.nombre_empresa.toUpperCase(), { align: 'center' });
        
        // NIT y Responsabilidad IVA
        let ivaTexto = '';
        if (emp.responsable_iva === 1 || emp.responsable_iva === "1") {
            ivaTexto = 'RESPONSABLE DE IVA';
        } else if (emp.responsabilidad_tributaria) {
            ivaTexto = emp.responsabilidad_tributaria.toUpperCase();
        } else {
            ivaTexto = 'NO RESPONSABLE DE IVA';
        }
        
        doc.fontSize(10).font('Helvetica').text(`NIT: ${emp.nit}`, { align: 'center' });
        doc.fontSize(9).text(ivaTexto, { align: 'center' });
        
        // Ubicación (Priorizar Ciudad/Depto, fallback a Ubicación Geográfica)
        const ciudadStr = emp.ciudad && emp.ciudad !== "null" ? emp.ciudad : '';
        const deptoStr = emp.departamento && emp.departamento !== "null" ? emp.departamento : '';
        
        let ubicacionFull = emp.direccion || '';
        if (ciudadStr || deptoStr) {
            ubicacionFull += `${ciudadStr ? ' - ' + ciudadStr : ''}${deptoStr ? ' - ' + deptoStr : ''}`;
        } else if (emp.ubicacion_geografica && emp.ubicacion_geografica !== "null") {
            ubicacionFull += ` - ${emp.ubicacion_geografica}`;
        }
        
        doc.text(ubicacionFull, { align: 'center' });
        
        // Contacto (Teléfonos y Email)
        let tels = '';
        try {
            if (emp.telefonos) {
                const parsed = JSON.parse(emp.telefonos);
                if (Array.isArray(parsed)) {
                    tels = parsed.filter((t: any) => t && String(t).trim()).join(' - ');
                } else {
                    tels = emp.telefonos;
                }
            }
            if (emp.telefono2 && !tels.includes(emp.telefono2)) {
                tels = tels ? `${tels} - ${emp.telefono2}` : emp.telefono2;
            }
        } catch(e) {
            tels = emp.telefonos || emp.telefono2 || '';
        }

        const email = emp.correo_electronico || emp.email;
        const emailDisplay = email && email !== 'null' ? email : 'N/A';

        doc.text(`Email: ${emailDisplay} - Tel: ${tels || 'N/A'}`, { align: 'center' });
        doc.moveDown(0.7);
    }
}
