const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'casa_montis.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando datos de facturas...\n');

// Verificar estructura de la tabla
db.all("PRAGMA table_info(facturas)", [], (err, columns) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }
  
  console.log('📋 Columnas de la tabla facturas:');
  columns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  console.log('');
  
  // Verificar datos recientes
  db.all(`
    SELECT 
      id, 
      comanda_id, 
      metodo_pago, 
      total, 
      monto_pagado, 
      cambio,
      fecha_creacion
    FROM facturas 
    ORDER BY fecha_creacion DESC 
    LIMIT 5
  `, [], (err, rows) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }
    
    console.log('📊 Últimas 5 facturas:');
    if (rows.length === 0) {
      console.log('  (No hay facturas)');
    } else {
      rows.forEach(row => {
        console.log(`\n  ID: ${row.id}`);
        console.log(`  Comanda: ${row.comanda_id}`);
        console.log(`  Método Pago: ${row.metodo_pago}`);
        console.log(`  Total: $${row.total}`);
        console.log(`  Monto Pagado: $${row.monto_pagado || 'NULL'}`);
        console.log(`  Cambio: $${row.cambio || 'NULL'}`);
        console.log(`  Fecha: ${row.fecha_creacion}`);
      });
    }
    
    db.close();
  });
});
