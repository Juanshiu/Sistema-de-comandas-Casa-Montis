const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const db = new sqlite3.Database('./database/casa_montis.db');

// Función auxiliar para obtener fecha en zona horaria de Colombia
const getFechaColombia = () => {
  return new Date().toLocaleString('en-CA', { 
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '');
};

console.log('🧪 Probando inserción de comanda con fecha de Colombia...');
console.log('🕒 Fecha/hora actual del sistema:', new Date().toLocaleString('es-CO'));
console.log('🇨🇴 Fecha Colombia generada:', getFechaColombia());

const comandaId = uuidv4();
const fechaColombia = getFechaColombia();

const insertQuery = `
  INSERT INTO comandas (id, mesero, subtotal, total, fecha_creacion, fecha_actualizacion)
  VALUES (?, ?, ?, ?, ?, ?)
`;

db.run(insertQuery, [comandaId, 'Test Mesero', 10000, 10000, fechaColombia, fechaColombia], function(err) {
  if (err) {
    console.error('❌ Error al insertar:', err);
  } else {
    console.log('✅ Comanda insertada con ID:', comandaId.substring(0, 8) + '...');
    
    // Verificar la fecha guardada
    db.get('SELECT * FROM comandas WHERE id = ?', [comandaId], (err, row) => {
      if (err) {
        console.error('❌ Error al consultar:', err);
      } else {
        console.log('📅 Fecha guardada en BD:', row.fecha_creacion);
        console.log('📅 Fecha formateada:', new Date(row.fecha_creacion).toLocaleString('es-CO'));
        
        // Limpiar la comanda de prueba
        db.run('DELETE FROM comandas WHERE id = ?', [comandaId], (err) => {
          if (err) {
            console.error('❌ Error al limpiar:', err);
          } else {
            console.log('🧹 Comanda de prueba eliminada');
          }
          db.close();
        });
      }
    });
  }
});