const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'casa_montis.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Script de prueba: Crear factura con monto_pagado y cambio\n');

// Buscar una comanda activa para probar
db.get(`
  SELECT * FROM comandas 
  WHERE estado IN ('lista', 'entregada') 
  LIMIT 1
`, [], (err, comanda) => {
  if (err || !comanda) {
    console.log('⚠️  No hay comandas disponibles para prueba');
    db.close();
    return;
  }

  console.log(`✅ Comanda encontrada: ${comanda.id}`);
  console.log(`   Total: $${comanda.total}`);

  const facturaId = 'test-' + Date.now();
  const montoPagado = comanda.total + 10000; // Simular que pagó de más
  const cambio = 10000;

  console.log(`\n📝 Creando factura de prueba:`);
  console.log(`   ID: ${facturaId}`);
  console.log(`   Monto Pagado: $${montoPagado}`);
  console.log(`   Cambio: $${cambio}`);

  db.run(`
    INSERT INTO facturas (
      id, comanda_id, subtotal, total, 
      metodo_pago, cajero, monto_pagado, cambio, fecha_creacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `, [
    facturaId,
    comanda.id,
    comanda.subtotal,
    comanda.total,
    'efectivo',
    'Test',
    montoPagado,
    cambio
  ], function(err) {
    if (err) {
      console.error('\n❌ Error al crear factura:', err);
      db.close();
      return;
    }

    console.log('\n✅ Factura creada exitosamente');

    // Verificar que se guardó correctamente
    db.get(`
      SELECT * FROM facturas WHERE id = ?
    `, [facturaId], (err, factura) => {
      if (err) {
        console.error('❌ Error al verificar:', err);
      } else {
        console.log('\n🔍 Verificación:');
        console.log(`   Monto Pagado guardado: $${factura.monto_pagado}`);
        console.log(`   Cambio guardado: $${factura.cambio}`);
        
        if (factura.monto_pagado === montoPagado && factura.cambio === cambio) {
          console.log('\n✅ ¡Los datos se guardaron correctamente!');
        } else {
          console.log('\n❌ Los datos NO coinciden');
        }
      }
      
      // Limpiar: eliminar factura de prueba
      db.run('DELETE FROM facturas WHERE id = ?', [facturaId], () => {
        console.log('\n🧹 Factura de prueba eliminada');
        db.close();
      });
    });
  });
});
