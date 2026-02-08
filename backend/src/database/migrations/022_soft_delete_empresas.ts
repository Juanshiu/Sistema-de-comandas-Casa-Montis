/**
 * Migración 022: Soft Delete para Empresas
 * 
 * Implementa eliminación lógica segura de empresas (tenants)
 * siguiendo principios SaaS profesionales.
 * 
 * Campos agregados a empresas:
 * - deleted_at: Timestamp de eliminación (NULL = no eliminada)
 * - deleted_by: UUID del super admin que eliminó
 * - delete_reason: Motivo de la eliminación (obligatorio)
 * 
 * ⚠️ NO se usa DELETE físico, solo marcado lógico
 * ⚠️ Todas las queries deben filtrar WHERE deleted_at IS NULL
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  console.log('🔄 Ejecutando migración 022: Soft Delete Empresas...');

  // 1. Agregar campos de soft delete a empresas
  const columnsCheck = await sql<{ column_name: string }>`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'empresas' 
    AND column_name IN ('deleted_at', 'deleted_by', 'delete_reason')
  `.execute(db);

  const existingColumns = columnsCheck.rows.map((r: any) => r.column_name);

  if (!existingColumns.includes('deleted_at')) {
    await sql`
      ALTER TABLE empresas 
      ADD COLUMN deleted_at TIMESTAMP NULL
    `.execute(db);
    console.log('  ✅ Campo deleted_at agregado a empresas');
  }

  if (!existingColumns.includes('deleted_by')) {
    await sql`
      ALTER TABLE empresas 
      ADD COLUMN deleted_by UUID NULL
    `.execute(db);
    console.log('  ✅ Campo deleted_by agregado a empresas');
  }

  if (!existingColumns.includes('delete_reason')) {
    await sql`
      ALTER TABLE empresas 
      ADD COLUMN delete_reason TEXT NULL
    `.execute(db);
    console.log('  ✅ Campo delete_reason agregado a empresas');
  }

  // 2. Agregar índice para optimizar queries de empresas no eliminadas
  try {
    await sql`
      CREATE INDEX IF NOT EXISTS idx_empresas_deleted_at 
      ON empresas (deleted_at) 
      WHERE deleted_at IS NULL
    `.execute(db);
    console.log('  ✅ Índice idx_empresas_deleted_at creado');
  } catch (e) {
    console.log('  ⚠️ Índice idx_empresas_deleted_at ya existe');
  }

  // 3. Agregar acción de auditoría para eliminación
  await sql`
    INSERT INTO auditoria_saas (id, accion, empresa_id, admin_id, admin_email, detalles, created_at)
    SELECT 
      gen_random_uuid(),
      'migracion_soft_delete',
      NULL,
      (SELECT id FROM usuarios WHERE is_super_admin = true LIMIT 1),
      (SELECT email FROM usuarios WHERE is_super_admin = true LIMIT 1),
      '{"descripcion": "Migración 022: Campos de soft delete agregados a empresas"}'::jsonb,
      NOW()
    WHERE EXISTS (SELECT 1 FROM usuarios WHERE is_super_admin = true)
  `.execute(db);

  console.log('✅ Migración 022 completada: Soft Delete Empresas');
}

export async function down(db: Kysely<any>): Promise<void> {
  console.log('🔄 Revirtiendo migración 022...');

  // ⚠️ PRECAUCIÓN: Esto eliminará el historial de eliminaciones
  await sql`ALTER TABLE empresas DROP COLUMN IF EXISTS delete_reason`.execute(db);
  await sql`ALTER TABLE empresas DROP COLUMN IF EXISTS deleted_by`.execute(db);
  await sql`ALTER TABLE empresas DROP COLUMN IF EXISTS deleted_at`.execute(db);
  
  await sql`DROP INDEX IF EXISTS idx_empresas_deleted_at`.execute(db);

  console.log('✅ Migración 022 revertida');
}
