const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/casa_montis.db');

console.log('🔍 Verificando base de datos...');

// Verificar qué tablas existen
db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
  if (err) {
    console.error('❌ Error al obtener tablas:', err);
  } else {
    console.log('📋 Tablas encontradas:', rows);
  }
  
  // Verificar si existe la tabla comandas específicamente
  db.get('SELECT name FROM sqlite_master WHERE type="table" AND name="comandas"', (err, row) => {
    if (err) {
      console.error('❌ Error al verificar tabla comandas:', err);
    } else if (row) {
      console.log('✅ Tabla comandas existe');
      
      // Contar comandas
      db.get('SELECT COUNT(*) as total FROM comandas', (err, result) => {
        if (err) {
          console.error('❌ Error al contar comandas:', err);
        } else {
          console.log('📊 Total de comandas:', result.total);
        }
        
        // Mostrar algunas comandas
        db.all('SELECT id, fecha_creacion, mesero, estado FROM comandas LIMIT 5', (err, rows) => {
          if (err) {
            console.error('❌ Error al obtener comandas:', err);
          } else {
            console.log('📋 Primeras 5 comandas:', rows);
          }
          db.close();
        });
      });
    } else {
      console.log('❌ Tabla comandas NO existe');
      db.close();
    }
  });
});