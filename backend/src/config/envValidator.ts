/**
 * Validador de Variables de Entorno
 * FASE 1.1 - Consolidación SaaS
 * 
 * Este módulo verifica que todas las variables de entorno críticas
 * estén configuradas antes de iniciar la aplicación.
 * 
 * ❌ NO loguea secretos
 * ❌ NO permite arrancar sin variables críticas
 * ✅ Detiene el proceso con código de error si falta algo
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  sensitive?: boolean; // Si true, no se logueará el valor
  defaultValue?: string; // Solo para desarrollo, no para producción
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'URL de conexión a PostgreSQL',
    sensitive: true
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secreto para firmar tokens JWT',
    sensitive: true
  },
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Entorno de ejecución (development, production, test)',
    defaultValue: 'development'
  },
  {
    name: 'PORT',
    required: false,
    description: 'Puerto del servidor HTTP',
    defaultValue: '3001'
  }
];

interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
  summary: string;
}

/**
 * Valida que todas las variables de entorno requeridas estén presentes
 */
export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    missing: [],
    warnings: [],
    summary: ''
  };

  const isProduction = process.env.NODE_ENV === 'production';

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      if (envVar.required) {
        // En producción, no hay valores por defecto
        if (isProduction || !envVar.defaultValue) {
          result.valid = false;
          result.missing.push(`${envVar.name} - ${envVar.description}`);
        } else {
          // En desarrollo, usar valor por defecto
          process.env[envVar.name] = envVar.defaultValue;
          result.warnings.push(
            `${envVar.name}: usando valor por defecto (solo desarrollo)`
          );
        }
      }
    } else {
      // Validaciones adicionales de formato
      if (envVar.name === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
        result.valid = false;
        result.missing.push(`${envVar.name} - Debe ser una URL válida de PostgreSQL`);
      }

      if (envVar.name === 'JWT_SECRET' && isProduction) {
        // En producción, el JWT_SECRET debe ser seguro
        if (value.length < 32) {
          result.warnings.push(
            'JWT_SECRET: Se recomienda un secreto de al menos 32 caracteres en producción'
          );
        }
        if (value.includes('dev') || value.includes('secret') || value.includes('key')) {
          result.warnings.push(
            'JWT_SECRET: Parece un valor de desarrollo. Usar un secreto aleatorio en producción'
          );
        }
      }
    }
  }

  // Construir resumen
  if (result.valid) {
    result.summary = '✅ Todas las variables de entorno críticas están configuradas';
  } else {
    result.summary = `❌ Faltan ${result.missing.length} variable(s) de entorno obligatoria(s)`;
  }

  return result;
}

/**
 * Ejecuta la validación y detiene el proceso si falla
 * Llamar ANTES de iniciar la aplicación
 */
export function enforceEnvironment(): void {
  console.log('\n🔐 Validando variables de entorno...\n');

  const result = validateEnvironment();

  // Mostrar warnings (sin exponer valores sensibles)
  if (result.warnings.length > 0) {
    console.log('⚠️  Advertencias:');
    result.warnings.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }

  // Si hay errores críticos, detener
  if (!result.valid) {
    console.error('❌ ERROR: Variables de entorno faltantes o inválidas:\n');
    result.missing.forEach(m => console.error(`   ❌ ${m}`));
    console.error('\n');
    console.error('Por favor, configure las variables en .env o en el entorno del sistema.');
    console.error('Consulte .env.example para ver un ejemplo de configuración.\n');
    
    // Salir con código de error
    process.exit(1);
  }

  console.log(result.summary);
  console.log(`📍 Entorno: ${process.env.NODE_ENV}`);
  console.log(`📍 Puerto: ${process.env.PORT}`);
  console.log('');
}

/**
 * Obtiene el valor de una variable de entorno con tipo seguro
 * Para uso interno del sistema (no expone valores sensibles en logs)
 */
export function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable de entorno ${name} no está definida`);
  }
  return value;
}

/**
 * Helper para verificar si estamos en producción
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Helper para verificar si estamos en desarrollo
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}
