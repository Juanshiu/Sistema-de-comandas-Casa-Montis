import { db } from '../database/database';
import { FacturasTable } from '../database/types';
import { Insertable, Selectable, Updateable } from 'kysely';

export class FacturaRepository {
    async create(factura: Insertable<FacturasTable>) {
        return await db
            .insertInto('facturas')
            .values(factura)
            .returningAll()
            .executeTakeFirstOrThrow();
    }

    async findById(id: string, empresaId: string) {
        return await db
            .selectFrom('facturas')
            .selectAll()
            .where('id', '=', id)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();
    }

    async findByComandaId(comandaId: string, empresaId: string) {
        return await db
            .selectFrom('facturas')
            .selectAll()
            .where('comanda_id', '=', comandaId)
            .where('empresa_id', '=', empresaId)
            .executeTakeFirst();
    }

    async list(empresaId: string, limit: number = 50, offset: number = 0) {
        return await db
            .selectFrom('facturas')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .orderBy('fecha_emision', 'desc')
            .limit(limit)
            .offset(offset)
            .execute();
    }
}
