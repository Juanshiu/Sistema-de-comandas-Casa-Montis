import { FacturaRepository } from '../repositories/facturaRepository';
import { ComandaRepository } from '../repositories/comandaRepository';
import { MesaRepository } from '../repositories/mesaRepository';
import { db } from '../database/database';
import { getFechaISO_Colombia } from '../utils/dateUtils';

export class FacturaService {
    private facturaRepo = new FacturaRepository();
    private comandaRepo = new ComandaRepository();
    private mesaRepo = new MesaRepository();

    async crearFactura(params: {
        comandaId: string;
        empresaId: string;
        metodoPago: string;
        montoPagado: number;
        cambio: number;
        clienteNombre?: string;
        clienteRut?: string;
    }) {
        const { comandaId, empresaId, metodoPago, montoPagado, cambio, clienteNombre, clienteRut } = params;

        return await db.transaction().execute(async (trx) => {
            // 1. Verificar comanda
            const comanda = await trx
                .selectFrom('comandas')
                .selectAll()
                .where('id', '=', comandaId)
                .where('empresa_id', '=', empresaId)
                .executeTakeFirst();

            if (!comanda) throw new Error('Comanda no encontrada');
            if (comanda.estado !== 'lista') throw new Error('La comanda debe estar en estado lista para facturar');

            // 2. Obtener items para inventario
            const items = await trx
                .selectFrom('comanda_items')
                .selectAll()
                .where('comanda_id', '=', comandaId)
                .where('empresa_id', '=', empresaId)
                .execute();

            // 3. Crear factura
            const factura = await trx
                .insertInto('facturas')
                .values({
                    empresa_id: empresaId,
                    comanda_id: comandaId,
                    cliente_nombre: clienteNombre || comanda.cliente_nombre || 'Consumidor Final',
                    cliente_rut: clienteRut || '222222222222',
                    monto_total: comanda.total,
                    // url_pdf se puede generar después
                })
                .returningAll()
                .executeTakeFirstOrThrow();

            // 4. Actualizar comanda
            await trx
                .updateTable('comandas')
                .set({
                    estado: 'pagada',
                    monto_pagado: montoPagado,
                    cambio: cambio,
                    metodo_pago: metodoPago,
                    fecha_cierre: getFechaISO_Colombia() as any
                })
                .where('id', '=', comandaId)
                .where('empresa_id', '=', empresaId)
                .execute();

            // 5. Liberar mesas
            const mesasRelacionadas = await trx
                .selectFrom('comanda_mesas')
                .select('mesa_id')
                .where('comanda_id', '=', comandaId)
                .where('empresa_id', '=', empresaId)
                .execute();

            for (const rel of mesasRelacionadas) {
                await trx
                    .updateTable('mesas')
                    .set({ ocupada: false })
                    .where('id', '=', rel.mesa_id)
                    .where('empresa_id', '=', empresaId)
                    .execute();
            }

            return factura;
        });
    }

    async obtenerFacturas(empresaId: string) {
        return await this.facturaRepo.list(empresaId);
    }

    async obtenerDetalleFactura(id: string, empresaId: string) {
        const factura = await this.facturaRepo.findById(id, empresaId);
        if (!factura) return null;

        const comanda = await this.comandaRepo.findById(factura.comanda_id, empresaId);
        const items = await db
            .selectFrom('comanda_items')
            .innerJoin('productos', 'productos.id', 'comanda_items.producto_id')
            .select([
                'comanda_items.cantidad',
                'comanda_items.precio_unitario',
                'comanda_items.total',
                'productos.nombre as producto_nombre'
            ])
            .where('comanda_items.comanda_id', '=', factura.comanda_id)
            .execute();

        return {
            ...factura,
            comanda,
            items
        };
    }
}
