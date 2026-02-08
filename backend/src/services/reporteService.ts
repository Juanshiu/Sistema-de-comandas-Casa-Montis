import { ReporteRepository } from '../repositories/reporteRepository';

export class ReporteService {
    private repo = new ReporteRepository();

    async generarReporteDiario(empresaId: string, fecha: string) {
        const [totales, metodosPago, productosTop, ventasPorHora] = await Promise.all([
            this.repo.getTotalesVentas(empresaId, fecha),
            this.repo.getVentasPorMetodoPago(empresaId, fecha),
            this.repo.getProductosMasVendidos(empresaId, fecha),
            this.repo.getVentasPorHora(empresaId, fecha)
        ]);

        const totalVentas = Number(totales?.total_ventas || 0);
        const cantidadComandas = Number(totales?.cantidad_comandas || 0);

        return {
            fecha,
            total_ventas: totalVentas,
            cantidad_comandas: cantidadComandas,
            promedio_por_comanda: cantidadComandas > 0 ? totalVentas / cantidadComandas : 0,
            metodos_pago: metodosPago.map(m => ({
                metodo: m.metodo_pago || 'otro',
                cantidad: Number(m.cantidad),
                total: Number(m.total),
                porcentaje: totalVentas > 0 ? (Number(m.total) / totalVentas) * 100 : 0
            })),
            productos_mas_vendidos: productosTop.map(p => ({
                producto: {
                    id: p.id,
                    nombre: p.nombre,
                    categoria: p.categoria || 'Sin categoría'
                },
                cantidad_vendida: Number(p.cantidad),
                total_vendido: Number(p.total_ventas)
            })),
            ventas_por_hora: ventasPorHora.map(v => ({
                hora: Number(v.hora),
                comandas: Number(v.cantidad),
                ventas: Number(v.total)
            })),
            comparativas: {
                vs_dia_anterior: { ventas: 0, ventas_porcentaje: 0, comandas: 0, comandas_porcentaje: 0 },
                vs_semana_anterior: { ventas: 0, ventas_porcentaje: 0, comandas: 0, comandas_porcentaje: 0 },
                vs_promedio_semanal: { ventas: 0, ventas_porcentaje: 0, comandas: 0, comandas_porcentaje: 0 }
            },
            alertas: []
        };
    }

    async generarReporteRango(empresaId: string, fechaInicio: string, fechaFin: string) {
        // Para el rango, generamos una lista de reportes diarios simplificados
        const start = new Date(fechaInicio);
        const end = new Date(fechaFin);
        const days = [];
        
        for(let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(new Date(d).toISOString().split('T')[0]);
        }

        // Ejecutar en paralelo para mayor velocidad
        const reportes = await Promise.all(days.map(fecha => this.generarReporteDiario(empresaId, fecha)));
        
        return reportes;
    }
}
