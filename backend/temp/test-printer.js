// Script de prueba para verificar la conexión con la impresora

const ESC_POS_URL = 'http://localhost:8001/imprimir';
const PRINTER_NAME = 'pos58';

async function testPrinter() {
  try {
    console.log('🖨️  Probando conexión con la impresora...');
    console.log(`🌐 URL: ${ESC_POS_URL}`);
    console.log(`🖨️  Impresora: ${PRINTER_NAME}`);
    console.log('');
    
    const contenidoPrueba = `
================================
        CASA MONTIS
      PRUEBA DE IMPRESORA
================================
Fecha: ${new Date().toLocaleString('es-CO')}
Hora: ${new Date().toLocaleTimeString('es-CO')}
================================
Si ve este mensaje,
la impresora funciona
correctamente.
================================


`;
    
    const payload = {
      texto: contenidoPrueba,
      impresora: PRINTER_NAME,
      cortar: true,
      encoding: 'cp850'
    };
    
    console.log('📦 Enviando solicitud de impresión...');
    
    const response = await fetch(ESC_POS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP ${response.status}: ${errorText}`);
      return false;
    }
    
    const resultado = await response.json();
    console.log('✅ Respuesta del plugin:', resultado);
    console.log('✅ Impresión enviada exitosamente');
    console.log('');
    console.log('👀 Verifica si salió la impresión en tu impresora.');
    return true;
    
  } catch (error) {
    console.error('❌ Error al imprimir:', error.message);
    console.log('');
    console.log('⚠️  Verifica que:');
    console.log('   1. El plugin HTTP esté corriendo en el puerto 8001');
    console.log('   2. La impresora "pos58" esté conectada y encendida');
    console.log('   3. La impresora esté configurada correctamente en Windows');
    return false;
  }
}

testPrinter();
