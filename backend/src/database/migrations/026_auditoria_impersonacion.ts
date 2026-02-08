import { Kysely, sql } from 'kysely';

/**
 * Migración 023: Sistema de Impersonación Segura
 * 
 * Crea la tabla de auditoría para registrar todas las acciones de impersonación
 * realizadas por Super Admins al acceder al sistema como usuarios de empresas clientes.
 * 
 * Campos clave:
 * - usuario_impersonado_id: Usuario cuya sesión fue asumida
 * - super_admin_id: Super Admin que realizó la impersonación
 * - tipo_evento: 'INICIADA' | 'FINALIZADA' | 'EXPIRADA'
 * - ip_address: IP desde donde se originó la impersonación
 * - fecha_inicio: Timestamp de inicio de la sesión
 * - fecha_fin: Timestamp de fin (si aplica)
 */
export async function up(db: Kysely<any>): Promise<void> {
  // Crear tabla de auditoría de impersonación
  await db.schema
    .createTable('auditoria_impersonacion')
    .addColumn('id', 'uuid', (col) => 
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('empresa_id', 'uuid', (col) => 
      col.notNull().references('empresas.id').onDelete('cascade')
    )
    .addColumn('usuario_impersonado_id', 'uuid', (col) => 
      col.notNull().references('usuarios.id').onDelete('cascade')
    )
    .addColumn('super_admin_id', 'uuid', (col) => 
      col.notNull().references('usuarios.id').onDelete('cascade')
    )
    .addColumn('tipo_evento', 'varchar(20)', (col) => 
      col.notNull().check(sql`tipo_evento IN ('INICIADA', 'FINALIZADA', 'EXPIRADA')`)
    )
    .addColumn('ip_address', 'varchar(45)') // IPv4 o IPv6
    .addColumn('user_agent', 'text')
    .addColumn('fecha_inicio', 'timestamptz', (col) => 
      col.notNull().defaultTo(sql`NOW()`)
    )
    .addColumn('fecha_fin', 'timestamptz')
    .addColumn('duracion_segundos', 'integer')
    .addColumn('metadata', 'jsonb') // Información adicional (navegador, acciones críticas, etc.)
    .addColumn('created_at', 'timestamptz', (col) => 
      col.notNull().defaultTo(sql`NOW()`)
    )
    .execute();

  // Índices para optimizar consultas de auditoría
  await db.schema
    .createIndex('idx_auditoria_impersonacion_empresa')
    .on('auditoria_impersonacion')
    .column('empresa_id')
    .execute();

  await db.schema
    .createIndex('idx_auditoria_impersonacion_usuario')
    .on('auditoria_impersonacion')
    .column('usuario_impersonado_id')
    .execute();

  await db.schema
    .createIndex('idx_auditoria_impersonacion_admin')
    .on('auditoria_impersonacion')
    .column('super_admin_id')
    .execute();

  await db.schema
    .createIndex('idx_auditoria_impersonacion_fecha')
    .on('auditoria_impersonacion')
    .columns(['fecha_inicio', 'tipo_evento'])
    .execute();

  console.log('✅ Migración 023: Tabla auditoria_impersonacion creada');
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('auditoria_impersonacion').execute();
  console.log('⬇️ Migración 023: Tabla auditoria_impersonacion eliminada');
}
