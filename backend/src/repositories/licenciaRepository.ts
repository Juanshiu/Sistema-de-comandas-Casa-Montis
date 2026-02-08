/**
 * Repository para Licencias SaaS
 * FASE 2.2 - Consolidación SaaS
 * 
 * Maneja todas las operaciones de base de datos relacionadas con licencias.
 * ✅ Solo acceso a datos, sin lógica de negocio
 */

import { db } from '../database/database';
import { sql } from 'kysely';

export interface LicenciaInsert {
  empresa_id: string;
  plan: string;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  estado: string;
  max_usuarios?: number;
  max_mesas?: number;
  features?: Record<string, boolean>;
  notas?: string;
}

export interface LicenciaUpdate {
  plan?: string;
  fecha_fin?: Date | null;
  estado?: string;
  max_usuarios?: number;
  max_mesas?: number;
  features?: Record<string, boolean>;
  notas?: string;
}

export class LicenciaRepository {
  /**
   * Crear nueva licencia
   */
  async create(data: LicenciaInsert) {
    const result = await db
      .insertInto('licencias')
      .values({
        empresa_id: data.empresa_id,
        plan: data.plan,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
        estado: data.estado,
        max_usuarios: data.max_usuarios ?? 5,
        max_mesas: data.max_mesas ?? 20,
        features: data.features ? JSON.stringify(data.features) : null,
        notas: data.notas ?? null
      } as any)
      .returning(['id', 'empresa_id', 'plan', 'fecha_inicio', 'fecha_fin', 'estado'])
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Obtener licencia por ID
   */
  async findById(id: string) {
    return await db
      .selectFrom('licencias')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Obtener licencia activa de una empresa
   */
  async findActiveByEmpresaId(empresaId: string) {
    return await db
      .selectFrom('licencias')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .where('estado', '=', 'activo')
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
  }

  /**
   * Obtener todas las licencias de una empresa
   */
  async findByEmpresaId(empresaId: string) {
    return await db
      .selectFrom('licencias')
      .selectAll()
      .where('empresa_id', '=', empresaId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * Listar todas las licencias (para admin SaaS)
   */
  async findAll(filtros?: { estado?: string; plan?: string }) {
    let query = db
      .selectFrom('licencias')
      .innerJoin('empresas', 'empresas.id', 'licencias.empresa_id')
      .select([
        'licencias.id',
        'licencias.empresa_id',
        'licencias.plan',
        'licencias.fecha_inicio',
        'licencias.fecha_fin',
        'licencias.estado',
        'licencias.max_usuarios',
        'licencias.max_mesas',
        'licencias.created_at',
        'empresas.nombre as empresa_nombre'
      ]);

    if (filtros?.estado) {
      query = query.where('licencias.estado', '=', filtros.estado);
    }
    if (filtros?.plan) {
      query = query.where('licencias.plan', '=', filtros.plan);
    }

    return await query.orderBy('licencias.created_at', 'desc').execute();
  }

  /**
   * Actualizar licencia
   */
  async update(id: string, data: LicenciaUpdate) {
    const updateData: any = { ...data, updated_at: new Date() };
    
    if (data.features) {
      updateData.features = JSON.stringify(data.features);
    }

    const result = await db
      .updateTable('licencias')
      .set(updateData)
      .where('id', '=', id)
      .returning(['id', 'empresa_id', 'plan', 'estado'])
      .executeTakeFirst();

    return result;
  }

  /**
   * Contar licencias por expirar en los próximos N días
   */
  async countExpiringInDays(dias: number) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const result = await db
      .selectFrom('licencias')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('estado', '=', 'activo')
      .where('fecha_fin', 'is not', null)
      .where('fecha_fin', '<=', fechaLimite)
      .executeTakeFirst();

    return result?.count ?? 0;
  }

  /**
   * Contar licencias expiradas
   */
  async countExpired() {
    const result = await db
      .selectFrom('licencias')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('estado', '=', 'expirado')
      .executeTakeFirst();

    return result?.count ?? 0;
  }

  /**
   * Marcar licencias expiradas automáticamente
   * (para usar en un cron job)
   */
  async marcarExpiradas() {
    const now = new Date();

    const result = await db
      .updateTable('licencias')
      .set({ estado: 'expirado', updated_at: now.toISOString() } as any)
      .where('estado', '=', 'activo')
      .where('fecha_fin', 'is not', null)
      .where('fecha_fin', '<', now)
      .returning(['id', 'empresa_id'])
      .execute();

    return result;
  }
}
