const http = require('http');

async function probarEndpoint() {
  try {
    console.log('🔍 Probando endpoint del historial...');
    
    const options = {
      hostname: '192.168.18.210',
      port: 3001,
      path: '/api/comandas/historial',
      method: 'GET',
      timeout: 5000
    };
    
    console.log('📡 Probando conexión a:', `http://${options.hostname}:${options.port}${options.path}`);
    
    const responseData = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        console.log('✅ Respuesta recibida!');
        console.log('📊 Status:', res.statusCode);
        console.log('📋 Headers:', res.headers['content-type']);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (e) {
            console.log('📄 Respuesta no JSON:', data.substring(0, 200));
            resolve(data);
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TIMEOUT'));
      });
      
      req.setTimeout(5000);
      req.end();
    });
    
    if (Array.isArray(responseData)) {
      console.log('📊 Comandas recibidas:', responseData.length);
      if (responseData.length > 0) {
        console.log('📝 Primera comanda:', {
          id: responseData[0].id,
          fecha: responseData[0].fecha,
          mesero: responseData[0].mesero,
          total: responseData[0].total
        });
      }
    } else {
      console.log('⚠️  Respuesta inesperada:', typeof responseData);
    }
    
  } catch (error) {
    console.error('❌ Error al probar endpoint:');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🚫 Conexión rechazada - El servidor no está corriendo');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Host no encontrado - IP incorrecta');
    } else if (error.message === 'TIMEOUT') {
      console.error('⏱️  Timeout - El servidor no responde');
    } else {
      console.error('🔧 Error:', error.message);
    }
    
    console.log('\n💡 El servidor backend probablemente no está corriendo');
    console.log('💡 Necesitas iniciar el servidor primero');
  }
}

probarEndpoint();