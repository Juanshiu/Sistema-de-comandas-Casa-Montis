import { db } from '../database/database';
import { ConfigFacturacionTable } from '../database/types';
import { Insertable, Updateable } from 'kysely';

export class ConfigFacturacionRepository {
    async findByEmpresaId(empresaId: string) {
        return await db
            .selectFrom('config_facturacion')
            .selectAll()
            .where('empresa_id', '=', empresaId)
            .orderBy('id', 'desc')
            .executeTakeFirst();
    }

    async upsert(empresaId: string, data: Insertable<ConfigFacturacionTable> | Updateable<ConfigFacturacionTable>) {
        const existing = await this.findByEmpresaId(empresaId);

        // Preparar datos para JSONB
        const preparedData: any = { ...data };
        
        // Asegurar que telefonos y tributos sean arrays válidos
        if (preparedData.telefonos && Array.isArray(preparedData.telefonos)) {
            preparedData.telefonos = JSON.stringify(preparedData.telefonos);
        }
        if (preparedData.tributos && Array.isArray(preparedData.tributos)) {
            preparedData.tributos = JSON.stringify(preparedData.tributos);
        }

        if (existing) {
            return await db
                .updateTable('config_facturacion')
                .set({ ...preparedData, updated_at: new Date() as any })
                .where('empresa_id', '=', empresaId)
                .returningAll()
                .executeTakeFirst();
        } else {
            return await db
                .insertInto('config_facturacion')
                .values({ ...preparedData, empresa_id: empresaId })
                .returningAll()
                .executeTakeFirst();
        }
    }
}
