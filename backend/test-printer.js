// Script para verificar impresoras disponibles y probar impresión
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function listarImpresoras() {
  console.log('\n🖨️  Listando impresoras disponibles...\n');
  
  try {
    const { stdout } = await execAsync('wmic printer get name,status,printerstatus', { timeout: 5000 });
    console.log(stdout);
    
    const impresoras = stdout
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line !== 'Name' && !line.startsWith('Name'))
      .filter(line => line.length > 0);
    
    console.log('\n📋 Impresoras detectadas:');
    impresoras.forEach((imp, index) => {
      console.log(`  ${index + 1}. ${imp}`);
    });
    
    return impresoras;
  } catch (error) {
    console.error('❌ Error al listar impresoras:', error.message);
    return [];
  }
}

async function probarImpresion(nombreImpresora) {
  console.log(`\n🔄 Probando impresión en: ${nombreImpresora}\n`);
  
  const contenidoPrueba = `
================================
        PRUEBA DE IMPRESION
        CASA MONTIS
================================
Fecha: ${new Date().toLocaleString('es-CO')}
Impresora: ${nombreImpresora}

Este es un texto de prueba
para verificar que la impresora
funciona correctamente.

================================
      FIN DE LA PRUEBA
================================
`;

  try {
    // Crear archivo temporal
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFile = path.join(tempDir, `test_${Date.now()}.txt`);
    const BOM = '\uFEFF';
    fs.writeFileSync(tempFile, BOM + contenidoPrueba, 'utf8');
    
    console.log(`📄 Archivo temporal creado: ${tempFile}`);
    
    // Probar diferentes métodos
    const metodos = [
      {
        nombre: 'PowerShell Out-Printer',
        comando: `powershell -Command "$content = Get-Content -Path '${tempFile}' -Raw -Encoding UTF8; $content | Out-Printer -Name '${nombreImpresora}'"`
      },
      {
        nombre: 'CMD copy',
        comando: `cmd /c "type \\"${tempFile}\\" > \\"\\\\\\\\%COMPUTERNAME%\\\\${nombreImpresora}\\""`
      },
      {
        nombre: 'CMD print',
        comando: `cmd /c "print /D:\\"${nombreImpresora}\\" \\"${tempFile}\\""`
      }
    ];
    
    for (const metodo of metodos) {
      try {
        console.log(`\n  🔄 Probando: ${metodo.nombre}...`);
        await execAsync(metodo.comando, { timeout: 10000 });
        console.log(`  ✅ ${metodo.nombre} - ÉXITO`);
        
        // Limpiar archivo
        setTimeout(() => {
          try {
            fs.unlinkSync(tempFile);
            console.log('  🗑️  Archivo temporal eliminado');
          } catch (e) {}
        }, 2000);
        
        return true;
      } catch (error) {
        console.log(`  ❌ ${metodo.nombre} - Falló:`, error.message);
      }
    }
    
    console.log('\n❌ Ningún método funcionó para esta impresora');
    return false;
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  HERRAMIENTA DE PRUEBA DE IMPRESORAS  ║');
  console.log('║         CASA MONTIS - 2025            ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const impresoras = await listarImpresoras();
  
  if (impresoras.length === 0) {
    console.log('\n⚠️  No se encontraron impresoras');
    return;
  }
  
  // Buscar impresoras POS
  const impresorasPOS = impresoras.filter(imp => 
    imp.toLowerCase().includes('pos') || 
    imp.toLowerCase().includes('58') ||
    imp.toLowerCase().includes('80')
  );
  
  if (impresorasPOS.length > 0) {
    console.log('\n\n🎯 Impresoras POS encontradas:');
    impresorasPOS.forEach(imp => console.log(`   - ${imp}`));
    
    console.log('\n\n🖨️  Probando impresión en impresoras POS...\n');
    
    for (const impresora of impresorasPOS) {
      const nombre = impresora.split(/\s+/)[0]; // Tomar solo el nombre
      await probarImpresion(nombre);
      console.log('\n' + '─'.repeat(50) + '\n');
    }
  }
  
  console.log('\n✅ Pruebas completadas\n');
}

main().catch(console.error);
