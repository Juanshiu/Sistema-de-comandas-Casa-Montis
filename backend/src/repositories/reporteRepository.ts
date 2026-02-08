import { db } from '../database/database';
import { sql } from 'kysely';

export class ReporteRepository {
    async getTotalesVentas(empresaId: string, fecha: string) {
        // Contar comandas pagadas (excluyendo canceladas) en lugar de facturas
        return await db
            .selectFrom('comandas')
            .select([
                (eb) => eb.fn.countAll().as('cantidad_comandas'),
                (eb) => eb.fn.sum('total').as('total_ventas')
            ])
            .where('empresa_id', '=', empresaId)
            .where('estado', '=', 'pagada') // Solo comandas pagadas, no canceladas
            .where(sql`DATE(fecha_cierre)`, '=', fecha) // Usar fecha_cierre para consistencia con historial
            .executeTakeFirst();
    }

    async getVentasPorMetodoPago(empresaId: string, fecha: string) {
        // Usar comandas directamente en lugar de facturas
        return await db
            .selectFrom('comandas')
            .select([
                'metodo_pago',
                (eb) => eb.fn.countAll().as('cantidad'),
                (eb) => eb.fn.sum('total').as('total')
            ])
            .where('empresa_id', '=', empresaId)
            .where('estado', '=', 'pagada') // Solo comandas pagadas
            .where(sql`DATE(fecha_cierre)`, '=', fecha)
            .groupBy('metodo_pago')
            .execute();
    }

    async getProductosMasVendidos(empresaId: string, fecha: string, limite: number = 10) {
        // Unir con comandas para filtrar solo las pagadas (no canceladas)
        return await db
            .selectFrom('comanda_items')
            .innerJoin('productos', 'productos.id', 'comanda_items.producto_id')
            .innerJoin('comandas', 'comandas.id', 'comanda_items.comanda_id')
            .leftJoin('categorias_productos', 'categorias_productos.id', 'productos.categoria_id')
            .select([
                'productos.id',
                'productos.nombre',
                'categorias_productos.nombre as categoria',
                (eb) => eb.fn.sum('comanda_items.cantidad').as('cantidad'),
                (eb) => eb.fn.sum('comanda_items.total').as('total_ventas')
            ])
            .where('comanda_items.empresa_id', '=', empresaId)
            .where('comandas.estado', '=', 'pagada') // Solo productos de comandas pagadas
            .where(sql`DATE(comandas.fecha_cierre)`, '=', fecha)
            .groupBy(['productos.id', 'productos.nombre', 'categorias_productos.nombre'])
            .orderBy('cantidad', 'desc')
            .limit(limite)
            .execute();
    }

    async getVentasPorHora(empresaId: string, fecha: string) {
        // Usar comandas pagadas en lugar de facturas
        return await db
            .selectFrom('comandas')
            .select([
                sql`EXTRACT(HOUR FROM fecha_cierre)`.as('hora'),
                (eb) => eb.fn.countAll().as('cantidad'),
                (eb) => eb.fn.sum('total').as('total')
            ])
            .where('empresa_id', '=', empresaId)
            .where('estado', '=', 'pagada') // Solo comandas pagadas
            .where(sql`DATE(fecha_cierre)`, '=', fecha)
            .groupBy(sql`EXTRACT(HOUR FROM fecha_cierre)`)
            .orderBy('hora')
            .execute();
    }
}
