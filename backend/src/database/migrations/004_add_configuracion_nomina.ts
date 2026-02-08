import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('configuracion_nomina')
        .addColumn('id', 'serial', (col) => col.primaryKey())
        .addColumn('empresa_id', 'uuid', (col) => col.notNull().references('empresas.id').onDelete('cascade'))
        .addColumn('anio', 'integer', (col) => col.notNull())
        .addColumn('salario_minimo', 'integer', (col) => col.notNull())
        .addColumn('auxilio_transporte', 'integer', (col) => col.notNull())
        .addColumn('uvt', 'integer', (col) => col.notNull())
        .addColumn('porc_salud_empleado', 'decimal', (col) => col.defaultTo(4))
        .addColumn('porc_pension_empleado', 'decimal', (col) => col.defaultTo(4))
        .addColumn('fondo_solidaridad_limite', 'integer', (col) => col.defaultTo(4))
        .addColumn('porc_salud_employer', 'decimal', (col) => col.defaultTo(8.5))
        .addColumn('porc_pension_employer', 'decimal', (col) => col.defaultTo(12))
        .addColumn('porc_caja_comp', 'decimal', (col) => col.defaultTo(4))
        .addColumn('porc_sena', 'decimal', (col) => col.defaultTo(2))
        .addColumn('porc_icbf', 'decimal', (col) => col.defaultTo(3))
        .addColumn('porc_cesantias', 'decimal', (col) => col.defaultTo(8.33))
        .addColumn('porc_intereses_cesantias', 'decimal', (col) => col.defaultTo(1))
        .addColumn('porc_prima', 'decimal', (col) => col.defaultTo(8.33))
        .addColumn('porc_vacaciones', 'decimal', (col) => col.defaultTo(4.17))
        .addColumn('porc_recargo_dominical', 'decimal', (col) => col.defaultTo(75))
        .addColumn('porc_recargo_festivo', 'decimal', (col) => col.defaultTo(75))
        .addColumn('porc_extra_diurna_dominical', 'decimal', (col) => col.defaultTo(100))
        .addColumn('horas_mensuales', 'integer', (col) => col.defaultTo(240))
        .addColumn('vigente', 'boolean', (col) => col.defaultTo(true))
        .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`))
        .execute();

    await sql`CREATE INDEX idx_config_nomina_empresa_id ON configuracion_nomina (empresa_id)`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('configuracion_nomina').execute();
}
