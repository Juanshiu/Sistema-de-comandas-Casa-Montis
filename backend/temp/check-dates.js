const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/casa_montis.db');

console.log('🕒 Verificando fechas en la base de datos...');
console.log('🌍 Fecha/hora actual del sistema:', new Date().toLocaleString('es-CO'));
console.log('🌍 Fecha/hora actual UTC:', new Date().toISOString());

db.all('SELECT id, fecha_creacion, mesero FROM comandas ORDER BY fecha_creacion DESC LIMIT 5', (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log('\n📋 Últimas 5 comandas:');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id.substring(0,8)}...`);
      console.log(`   Fecha BD: ${row.fecha_creacion}`);
      console.log(`   Fecha JS: ${new Date(row.fecha_creacion).toLocaleString('es-CO')}`);
      console.log(`   Mesero: ${row.mesero}`);
      console.log('');
    });
  }
  db.close();
});