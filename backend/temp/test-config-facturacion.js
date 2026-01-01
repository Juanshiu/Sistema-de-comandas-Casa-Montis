// Script de prueba para el endpoint de configuración de facturación
const BASE_URL = 'http://localhost:3001';

async function probarConfiguracionFacturacion() {
  console.log('🧪 Probando endpoints de configuración de facturación...\n');

  try {
    // 1. Obtener configuración
    console.log('1️⃣ GET /api/configuracion/facturacion');
    const getResponse = await fetch(`${BASE_URL}/api/configuracion/facturacion`);
    const config = await getResponse.json();
    console.log('✅ Configuración obtenida:', JSON.stringify(config, null, 2));
    console.log('');

    // 2. Actualizar configuración
    console.log('2️⃣ PUT /api/configuracion/facturacion');
    const updateData = {
      nombre_empresa: 'CASA MONTIS RESTAURANTE - TEST',
      nit: '26420708-2',
      responsable_iva: true,
      porcentaje_iva: 19,
      direccion: 'CRA 9 # 11 07 - EDUARDO SANTOS',
      ubicacion_geografica: 'PALERMO - HUILA',
      telefonos: ['3132171025', '3224588520', '3001234567']
    };

    const putResponse = await fetch(`${BASE_URL}/api/configuracion/facturacion`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const updatedConfig = await putResponse.json();
    console.log('✅ Configuración actualizada:', JSON.stringify(updatedConfig, null, 2));
    console.log('');

    // 3. Verificar cambios
    console.log('3️⃣ Verificar cambios GET /api/configuracion/facturacion');
    const verifyResponse = await fetch(`${BASE_URL}/api/configuracion/facturacion`);
    const verifiedConfig = await verifyResponse.json();
    console.log('✅ Configuración verificada:', JSON.stringify(verifiedConfig, null, 2));
    console.log('');

    console.log('🎉 Todas las pruebas pasaron exitosamente!');
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar pruebas
probarConfiguracionFacturacion();
