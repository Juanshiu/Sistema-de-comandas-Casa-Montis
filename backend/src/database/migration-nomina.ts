import { db } from './init';

/**
 * Migración para crear tablas del sistema de nómina y liquidación
 */
export const migrarNomina = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        console.log('🔄 Iniciando migración de nómina...');

        // 1. Tabla EMPLEADOS
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS empleados (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              tipo_documento TEXT NOT NULL,
              numero_documento TEXT NOT NULL UNIQUE,
              nombres TEXT NOT NULL,
              apellidos TEXT NOT NULL,
              direccion TEXT,
              municipio TEXT,
              celular TEXT,
              email TEXT,
              
              cargo TEXT NOT NULL,
              tipo_contrato TEXT NOT NULL, -- 'TERMINO_FIJO', 'INDEFINIDO', 'OBRA_LABOR', 'APRENDIZAJE'
              fecha_inicio DATE NOT NULL,
              fecha_fin DATE, -- Solo si aplica
              
              tipo_trabajador TEXT NOT NULL DEFAULT 'DEPENDIENTE', -- 'DEPENDIENTE', 'INDEPENDIENTE'
              subtipo_trabajador TEXT, -- 'PENSIONADO', etc.
              alto_riesgo BOOLEAN DEFAULT FALSE,
              salario_integral BOOLEAN DEFAULT FALSE,
              
              frecuencia_pago TEXT NOT NULL DEFAULT 'MENSUAL', -- 'MENSUAL', 'QUINCENAL'
              salario_base REAL NOT NULL,
              auxilio_transporte BOOLEAN DEFAULT TRUE,
              
              metodo_pago TEXT DEFAULT 'EFECTIVO', -- 'EFECTIVO', 'TRANSFERENCIA'
              banco TEXT,
              tipo_cuenta TEXT,
              numero_cuenta TEXT,
              
              estado TEXT DEFAULT 'ACTIVO', -- 'ACTIVO', 'INACTIVO', 'VACACIONES', 'LICENCIA'
              
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });
        console.log('✅ Tabla empleados verificada/creada');

        // 2. Tabla CONFIGURACION_NOMINA (Valores legales)
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS configuracion_nomina (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              anio INTEGER NOT NULL,
              salario_minimo REAL NOT NULL,
              auxilio_transporte REAL NOT NULL,
              uvt REAL NOT NULL,
              
              -- Porcentajes Empleado
              porc_salud_empleado REAL NOT NULL,
              porc_pension_empleado REAL NOT NULL,
              fondo_solidaridad_limite REAL NOT NULL, -- Base para aplicar fondo sol (ej. 4 SMMLV)
              
              -- Porcentajes Empleador
              porc_salud_empleador REAL NOT NULL,
              porc_pension_empleador REAL NOT NULL,
              porc_caja_comp REAL NOT NULL,
              porc_sena REAL NOT NULL,
              porc_icbf REAL NOT NULL,
              
              -- Prestaciones
              porc_cesantias REAL NOT NULL,
              porc_intereses_cesantias REAL NOT NULL,
              porc_prima REAL NOT NULL,
              porc_vacaciones REAL NOT NULL,
              
              -- Recargos y Extras
            porc_recargo_dominical REAL NOT NULL DEFAULT 80,
            porc_recargo_festivo REAL NOT NULL DEFAULT 80,
            porc_recargo_diurno REAL NOT NULL DEFAULT 25,
            porc_extra_diurna_dominical REAL NOT NULL DEFAULT 105,
            horas_mensuales INTEGER NOT NULL DEFAULT 220,
              
              vigente BOOLEAN DEFAULT TRUE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });
        console.log('✅ Tabla configuracion_nomina verificada/creada');

        // Insertar valores 2026 si no existen
        await new Promise<void>((res, rej) => {
             // Valores base 2026
            // SMLV 2026: 1.750.905, Aux: 249.095 (Ejemplo)
            const sqlCheck = "SELECT count(*) as count FROM configuracion_nomina WHERE vigente = 1";
            db.get(sqlCheck, [], (err, row: any) => {
                if(err) { rej(err); return; }
                if(row.count === 0) {
                     // Insertar 2026 (según pedido del usuario)
                     db.run(`
                        INSERT INTO configuracion_nomina (
                            anio, salario_minimo, auxilio_transporte, uvt,
                            porc_salud_empleado, porc_pension_empleado, fondo_solidaridad_limite,
                            porc_salud_empleador, porc_pension_empleador, porc_caja_comp, porc_sena, porc_icbf,
                            porc_cesantias, porc_intereses_cesantias, porc_prima, porc_vacaciones,
                            porc_recargo_dominical, porc_recargo_festivo, porc_recargo_diurno, porc_extra_diurna_dominical, horas_mensuales
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        2026, 1750905, 249095, 52374,
                        4.0, 4.0, 7003620, // 4 SMLV aprox
                        8.5, 12.0, 4.0, 2.0, 3.0,
                        8.33, 12.0, 8.33, 4.17,
                        80, 80, 25, 105, 220
                    ], (err) => {
                        if(err) rej(err);
                        else res();
                    });
                } else {
                    res();
                }
            });
        });

        // 3. Tabla NOMINAS (Cabecera de pago mensual)
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS nominas (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              periodo_inicio DATE NOT NULL,
              periodo_fin DATE NOT NULL,
              tipo TEXT NOT NULL DEFAULT 'NOMINA', -- 'NOMINA', 'PRIMA', 'VACACIONES'
              estado TEXT NOT NULL DEFAULT 'BORRADOR', -- 'BORRADOR', 'APROBADA', 'PAGADA'
              
              total_devengado REAL DEFAULT 0,
              total_deducciones REAL DEFAULT 0,
              total_pagado REAL DEFAULT 0,
              
              observaciones TEXT,
              version INTEGER NOT NULL DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });
        console.log('✅ Tabla nominas verificada/creada');

        // 4. Tabla NOMINA_DETALLES (Detalle por empleado)
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS nomina_detalles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nomina_id INTEGER NOT NULL,
              empleado_id INTEGER NOT NULL,
              
              dias_trabajados INTEGER NOT NULL,
              sueldo_basico REAL NOT NULL,
              auxilio_transporte REAL NOT NULL,
              horas_diurnas REAL DEFAULT 0,
              valor_diurnas REAL DEFAULT 0,
              horas_extras REAL DEFAULT 0,
              recargos REAL DEFAULT 0,
               comisiones REAL DEFAULT 0,
              otros_devengados REAL DEFAULT 0,
              
              -- Detalle recargos dom/fest
              horas_dominicales_diurnas REAL DEFAULT 0,
              horas_festivas_diurnas REAL DEFAULT 0,
              horas_extra_diurna_dominical REAL DEFAULT 0,
              valor_dominicales_diurnas REAL DEFAULT 0,
              valor_festivas_diurnas REAL DEFAULT 0,
              valor_extra_diurna_dominical REAL DEFAULT 0,

              total_devengado REAL NOT NULL,
              
              salud_empleado REAL NOT NULL,
              pension_empleado REAL NOT NULL,
              fondo_solidaridad REAL DEFAULT 0,
              prestamos REAL DEFAULT 0,
              otras_deducciones REAL DEFAULT 0,
              total_deducciones REAL NOT NULL,
              
              neto_pagado REAL NOT NULL,
              
              valores_empresa TEXT, -- JSON con costos empresa (salud, pension, parafiscales)
              
              -- Metadatos y versionado
              version INTEGER NOT NULL DEFAULT 1,
              estado TEXT NOT NULL DEFAULT 'ABIERTA', -- 'ABIERTA', 'PAGADA', 'AJUSTADA'
              periodo_mes TEXT,
              periodo_anio INTEGER,
              fecha_generacion DATETIME,
              usuario_nombre TEXT,
              pdf_version INTEGER DEFAULT 1,
              pdf_path TEXT,
              
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (nomina_id) REFERENCES nominas(id) ON DELETE CASCADE,
              FOREIGN KEY (empleado_id) REFERENCES empleados(id)
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });
        console.log('✅ Tabla nomina_detalles verificada/creada');

        // ALTER TABLES para compatibilidad (si ya existen las tablas)
        const columnsToAdd = [
            { table: 'configuracion_nomina', col: 'porc_recargo_dominical', type: 'REAL DEFAULT 80' },
            { table: 'configuracion_nomina', col: 'porc_recargo_festivo', type: 'REAL DEFAULT 80' },
            { table: 'configuracion_nomina', col: 'porc_recargo_diurno', type: 'REAL DEFAULT 25' },
            { table: 'configuracion_nomina', col: 'porc_extra_diurna_dominical', type: 'REAL DEFAULT 105' },
            { table: 'configuracion_nomina', col: 'horas_mensuales', type: 'INTEGER DEFAULT 220' },
            { table: 'nomina_detalles', col: 'horas_diurnas', type: 'REAL DEFAULT 0' },
            { table: 'nomina_detalles', col: 'valor_diurnas', type: 'REAL DEFAULT 0' },
            { table: 'nomina_detalles', col: 'horas_dominicales_diurnas', type: 'REAL DEFAULT 0' },
            { table: 'nomina_detalles', col: 'horas_festivas_diurnas', type: 'REAL DEFAULT 0' },
            { table: 'nomina_detalles', col: 'horas_extra_diurna_dominical', type: 'REAL DEFAULT 0' },
            { table: 'nomina_detalles', col: 'valor_dominicales_diurnas', type: 'REAL DEFAULT 0' },
            { table: 'nomina_detalles', col: 'valor_festivas_diurnas', type: 'REAL DEFAULT 0' },
            { table: 'nomina_detalles', col: 'valor_extra_diurna_dominical', type: 'REAL DEFAULT 0' },
            { table: 'nomina_detalles', col: 'version', type: "INTEGER DEFAULT 1" },
            { table: 'nomina_detalles', col: 'estado', type: "TEXT DEFAULT 'ABIERTA'" },
            { table: 'nomina_detalles', col: 'periodo_mes', type: 'TEXT' },
            { table: 'nomina_detalles', col: 'periodo_anio', type: 'INTEGER' },
            { table: 'nomina_detalles', col: 'fecha_generacion', type: 'DATETIME' },
            { table: 'nomina_detalles', col: 'usuario_nombre', type: 'TEXT' },
            { table: 'nomina_detalles', col: 'pdf_version', type: 'INTEGER DEFAULT 1' },
            { table: 'nomina_detalles', col: 'pdf_path', type: 'TEXT' },
            { table: 'nominas', col: 'version', type: 'INTEGER DEFAULT 1' },
            { table: 'pagos_nomina', col: 'empleado_id', type: 'INTEGER' },
            { table: 'pagos_nomina', col: 'periodo_mes', type: 'TEXT' },
            { table: 'pagos_nomina', col: 'periodo_anio', type: 'INTEGER' },
            { table: 'pagos_nomina', col: 'fecha', type: 'DATETIME' },
            { table: 'pagos_nomina', col: 'usuario_nombre', type: 'TEXT' },
            { table: 'pagos_nomina', col: 'observaciones', type: 'TEXT' }
        ];

        for (const item of columnsToAdd) {
            await new Promise<void>((res) => {
                db.run(`ALTER TABLE ${item.table} ADD COLUMN ${item.col} ${item.type}`, () => {
                    // Ignoramos error si la columna ya existe
                    res();
                });
            });
        }
        console.log('✅ Columnas adicionales verificadas/agregadas');

        // 5. Tabla pagos_nomina (pagos parciales: quincenas/ajustes)
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS pagos_nomina (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nomina_detalle_id INTEGER NOT NULL,
              empleado_id INTEGER,
              periodo_mes TEXT,
              periodo_anio INTEGER,
              fecha DATETIME NOT NULL,
              tipo TEXT NOT NULL, -- 'QUINCENA', 'AJUSTE', etc.
              valor REAL NOT NULL,
              usuario_nombre TEXT,
              observaciones TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (nomina_detalle_id) REFERENCES nomina_detalles(id)
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });
        console.log('✅ Tabla pagos_nomina verificada/creada');

        // 6. Tabla historial_nomina (versionado y auditoría)
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS historial_nomina (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              nomina_detalle_id INTEGER NOT NULL,
              version INTEGER NOT NULL,
              fecha DATETIME NOT NULL,
              cambio_realizado TEXT NOT NULL,
              usuario_nombre TEXT,
              payload TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (nomina_detalle_id) REFERENCES nomina_detalles(id)
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });
        console.log('✅ Tabla historial_nomina verificada/creada');

        // 7. Tabla LIQUIDACIONES
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS liquidaciones (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              empleado_id INTEGER NOT NULL,
              fecha_liquidacion DATETIME NOT NULL,
              fecha_inicio_contrato DATE NOT NULL,
              fecha_fin_contrato DATE NOT NULL,
              motivo_retiro TEXT,
              
              dias_laborados_total INTEGER,
              dias_liquidar_cesantias INTEGER,
              dias_liquidar_vacaciones INTEGER,
              base_liquidacion REAL NOT NULL,
              
              cesantias REAL NOT NULL,
              intereses_cesantias REAL NOT NULL,
              prima_servicios REAL NOT NULL,
              vacaciones REAL NOT NULL,
              indemnizacion REAL DEFAULT 0,
              
              total_liquidacion REAL NOT NULL,
              estado TEXT DEFAULT 'BORRADOR', -- 'BORRADOR', 'PAGADA'
              
              observaciones TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (empleado_id) REFERENCES empleados(id)
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });
        console.log('✅ Tabla liquidaciones verificada/creada');
        
        // 8. Tabla HISTORIAL_LIQUIDACIONES (Auditoría de liquidaciones)
        await new Promise<void>((res, rej) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS historial_liquidaciones (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              empleado_id INTEGER NOT NULL,
              fecha_liquidacion DATETIME NOT NULL,
              fecha_inicio_contrato DATE NOT NULL,
              fecha_fin_contrato DATE NOT NULL,
              tipo_contrato TEXT,
              tipo_terminacion TEXT,
              salario_fijo BOOLEAN DEFAULT 1,
              base_calculo REAL,
              base_calculo_detalle TEXT, -- JSON con detalles
              dias_laborados INTEGER,
              cesantias REAL,
              intereses_cesantias REAL,
              prima_servicios REAL,
              vacaciones REAL,
              indemnizacion REAL DEFAULT 0,
              total_liquidacion REAL,
              usuario_genero TEXT,
              version_normativa TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (empleado_id) REFERENCES empleados(id)
            )
          `, (err) => {
            if (err) rej(err);
            else res();
          });
        });
        console.log('✅ Tabla historial_liquidaciones verificada/creada');
        
        // 9. Nuevo Permiso 'nomina.gestion'
        await new Promise<void>((res, rej) => {
             // Buscar ID de superusuario
             db.get("SELECT id FROM roles WHERE es_superusuario = 1", [], (err, row: any) => {
                 if(err || !row) { res(); return; } // Si falla o no hay SU, saltar
                 const suId = row.id;
                 db.run("INSERT OR IGNORE INTO permisos_rol (rol_id, permiso, activo) VALUES (?, 'nomina.gestion', 1)", [suId], (err) => {
                     if(err) console.error("Error asignando permiso nomina:", err);
                     res();
                 });
             });
        });
        console.log('✅ Permiso nomina.gestion asignado a SU');

        resolve();
      } catch (error) {
        console.error('❌ Error en migración de nómina:', error);
        reject(error);
      }
    });
  });
};
