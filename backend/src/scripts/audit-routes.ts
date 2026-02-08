/**
 * Script de Auditoría de Rutas Multi-Tenant
 * FASE 1.3 - Consolidación SaaS
 * 
 * Este script analiza todos los archivos de rutas y verifica:
 * - ¿Usan req.context.empresaId correctamente?
 * - ¿Hay lecturas de empresa_id desde params o body? (MALO)
 * - ¿Hay parseInt() residuales de SQLite? (MALO)
 * - ¿Hay asunciones de IDs numéricos? (MALO)
 * 
 * ✅ Solo lectura, no modifica código
 * ✅ Genera reporte claro con ubicación de problemas
 */

import * as fs from 'fs';
import * as path from 'path';

interface Issue {
  file: string;
  line: number;
  type: 'ERROR' | 'WARNING';
  code: string;
  message: string;
  snippet: string;
}

interface AuditResult {
  issues: Issue[];
  filesScanned: number;
  routesWithCorrectPattern: number;
  summary: string;
}

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

// Patrones problemáticos
const PATTERNS = {
  // ERROR: empresa_id desde params o body
  empresaIdFromParams: {
    regex: /req\.(params|body)\.empresa[_]?[iI]d/g,
    message: 'empresa_id leído desde params/body en lugar de req.context',
    type: 'ERROR' as const
  },
  // ERROR: parseInt residual de SQLite
  parseIntOnId: {
    regex: /parseInt\s*\(\s*req\.(params|body)\.\w*id/gi,
    message: 'parseInt en ID - los IDs son UUIDs (strings), no números',
    type: 'ERROR' as const
  },
  // WARNING: Uso de Number() en IDs
  numberCastOnId: {
    regex: /Number\s*\(\s*req\.(params|body)\.\w*id/gi,
    message: 'Number() en ID - los IDs son UUIDs (strings), no números',
    type: 'ERROR' as const
  },
  // WARNING: empresa sin context
  empresaSinContext: {
    regex: /const\s+empresa[_]?[iI]d\s*=\s*req\.(params|body)/g,
    message: 'empresa_id debería venir de req.context, no de params/body',
    type: 'ERROR' as const
  },
  // WARNING: Posible query sin empresa_id
  selectWithoutEmpresa: {
    regex: /selectFrom\s*\(\s*['"`]\w+['"`]\s*\)(?![\s\S]*?where[\s\S]*?empresa)/gi,
    message: 'Query SELECT sin filtro de empresa_id visible (revisar manualmente)',
    type: 'WARNING' as const
  }
};

function scanFile(filePath: string): { issues: Issue[]; hasCorrectPattern: boolean } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileName = path.basename(filePath);
  const issues: Issue[] = [];
  
  // Verificar patrón correcto
  const hasCorrectPattern = /req\.context\.empresaId/g.test(content);

  // Buscar patrones problemáticos
  for (const [patternName, pattern] of Object.entries(PATTERNS)) {
    if (patternName === 'selectWithoutEmpresa') continue;

    pattern.regex.lastIndex = 0; // Reset regex
    let match;

    while ((match = pattern.regex.exec(content)) !== null) {
      // Encontrar número de línea
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const lineContent = lines[lineNumber - 1]?.trim() || '';

      issues.push({
        file: fileName,
        line: lineNumber,
        type: pattern.type,
        code: patternName,
        message: pattern.message,
        snippet: lineContent.substring(0, 80)
      });
    }
  }

  return { issues, hasCorrectPattern };
}

function audit(): void {
  console.log('\n🔍 AUDITORÍA DE RUTAS MULTI-TENANT\n');
  console.log('═'.repeat(70));

  const result: AuditResult = {
    issues: [],
    filesScanned: 0,
    routesWithCorrectPattern: 0,
    summary: ''
  };

  // Listar archivos de rutas
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts'));

  console.log(`\n📂 Escaneando ${files.length} archivos de rutas...\n`);

  for (const file of files) {
    const filePath = path.join(ROUTES_DIR, file);
    const { issues, hasCorrectPattern } = scanFile(filePath);

    result.filesScanned++;
    if (hasCorrectPattern) {
      result.routesWithCorrectPattern++;
    }
    result.issues.push(...issues);
  }

  // Agrupar issues por archivo
  const issuesByFile = new Map<string, Issue[]>();
  for (const issue of result.issues) {
    if (!issuesByFile.has(issue.file)) {
      issuesByFile.set(issue.file, []);
    }
    issuesByFile.get(issue.file)!.push(issue);
  }

  // Imprimir resultados
  const errors = result.issues.filter(i => i.type === 'ERROR');
  const warnings = result.issues.filter(i => i.type === 'WARNING');

  if (errors.length > 0) {
    console.log('❌ ERRORES CRÍTICOS:');
    console.log('-'.repeat(70));
    for (const [file, fileIssues] of issuesByFile) {
      const fileErrors = fileIssues.filter(i => i.type === 'ERROR');
      if (fileErrors.length === 0) continue;

      console.log(`\n  📄 ${file}:`);
      for (const issue of fileErrors) {
        console.log(`     Línea ${issue.line}: ${issue.message}`);
        console.log(`     └─ ${issue.snippet}`);
      }
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  ADVERTENCIAS:');
    console.log('-'.repeat(70));
    for (const [file, fileIssues] of issuesByFile) {
      const fileWarnings = fileIssues.filter(i => i.type === 'WARNING');
      if (fileWarnings.length === 0) continue;

      console.log(`\n  📄 ${file}:`);
      for (const issue of fileWarnings) {
        console.log(`     Línea ${issue.line}: ${issue.message}`);
      }
    }
    console.log('');
  }

  // Archivos limpios
  const cleanFiles = files.filter(f => !issuesByFile.has(f));
  if (cleanFiles.length > 0) {
    console.log('✅ ARCHIVOS SIN PROBLEMAS:');
    console.log('-'.repeat(70));
    for (const f of cleanFiles) {
      console.log(`   ✓ ${f}`);
    }
    console.log('');
  }

  // Resumen
  console.log('═'.repeat(70));
  console.log('📋 RESUMEN DE AUDITORÍA DE RUTAS');
  console.log('═'.repeat(70));
  console.log(`   📂 Archivos escaneados:       ${result.filesScanned}`);
  console.log(`   ✅ Con patrón correcto:       ${result.routesWithCorrectPattern}`);
  console.log(`   ❌ Errores críticos:          ${errors.length}`);
  console.log(`   ⚠️  Advertencias:              ${warnings.length}`);
  console.log('');

  if (errors.length === 0) {
    console.log('🎉 ¡Excelente! No se encontraron errores críticos en las rutas.');
  } else {
    console.log('⛔ Se encontraron errores que DEBEN corregirse antes de continuar.');
    console.log('   Todos los empresa_id deben venir de req.context.empresaId');
  }

  console.log('\n');
}

// Ejecutar
audit();
