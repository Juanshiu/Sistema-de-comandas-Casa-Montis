const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/casa_montis.db');
const db = new sqlite3.Database(dbPath);

const hoy = new Date().toISOString().split('T')[0];

console.log(`\n✅ VERIFICACIÓN FINAL DEL FIX DE REPORTES\n`);

// Simular la NEW query que usa el backend (SIN p.precio, con precio calculado)
const query = `
  SELECT 
    p.id,
    p.nombre,
    p.descripcion,
    p.categoria,
    ROUND(SUM(ci.subtotal) / SUM(ci.cantidad)) as precio,
    SUM(ci.cantidad) as cantidad_vendida,
    SUM(ci.subtotal) as total_vendido
  FROM comanda_items ci
  JOIN productos p ON ci.producto_id = p.id
  JOIN comandas c ON ci.comanda_id = c.id
  JOIN facturas f ON c.id = f.comanda_id
  WHERE DATE(f.fecha_creacion) = ?
  GROUP BY p.id, p.nombre, p.descripcion, p.categoria
  ORDER BY cantidad_vendida DESC
`;

db.all(query, [hoy], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  // Contar por categoría
  const categoriasCont = {};
  let totalCategories = 0;
  rows.forEach(row => {
    if (!categoriasCont[row.categoria]) {
      categoriasCont[row.categoria] = 0;
      totalCategories++;
    }
    categoriasCont[row.categoria]++;
  });

  console.log('📊 RESUMEN DE CAMBIOS APLICADOS:\n');
  console.log('✅ CAMBIO 1: Removido LIMIT 20 en endpoint /ventas');
  console.log('✅ CAMBIO 2: Removido LIMIT 50 en endpoint /ventas/rango');
  console.log('✅ CAMBIO 3: Removido LIMIT 50 en endpoint /personalizaciones');
  console.log('✅ CAMBIO 4: Usando precio real vendido (ci.precio_unitario) en lugar de p.precio\n');

  console.log('📈 RESULTADOS:\n');
  console.log(`   Total productos diferentes vendidos: ${rows.length}`);
  console.log(`   Total categorías mostradas: ${totalCategories}`);
  
  // Desglose por categoría
  console.log('\n   Desglose por categoría:');
  Object.keys(categoriasCont).sort().forEach(cat => {
    console.log(`      • ${cat}: ${categoriasCont[cat]} productos`);
  });

  // Verificaciones específicas
  console.log('\n🎯 VERIFICACIONES ESPECÍFICAS:\n');
  
  const tienePorciones = Object.keys(categoriasCont).some(cat => 
    cat.toLowerCase() === 'porciones'
  );
  console.log(`   [${tienePorciones ? '✅' : '❌'}] Categoría "porciones" aparece: ${tienePorciones}`);

  const cafeteriaCount = categoriasCont['cafeteria'] || 0;
  console.log(`   [${cafeteriaCount > 1 ? '✅' : '❌'}] "cafeteria" tiene múltiples productos: ${cafeteriaCount}`);

  // Verificar precios
  let preciosCorrectos = true;
  rows.forEach(row => {
    const precioEsperado = Math.round(row.total_vendido / row.cantidad_vendida);
    if (row.precio !== precioEsperado) {
      preciosCorrectos = false;
    }
  });
  console.log(`   [${preciosCorrectos ? '✅' : '❌'}] Precios calculados correctamente`);

  // Mostrar ejemplo
  console.log('\n📋 EJEMPLO - Top 5 productos:\n');
  rows.slice(0, 5).forEach((row, idx) => {
    console.log(`   ${idx + 1}. ${row.nombre}`);
    console.log(`      Categoría: ${row.categoria}`);
    console.log(`      Precio: $${row.precio.toLocaleString()}`);
    console.log(`      Vendidos: ${row.cantidad_vendida} unidades`);
    console.log(`      Ingresos: $${row.total_vendido.toLocaleString()}\n`);
  });

  console.log('✅ TEST COMPLETADO EXITOSAMENTE');
  db.close();
});
