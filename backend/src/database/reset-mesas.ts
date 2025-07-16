import { db } from '../database/init';

// Script para resetear todas las mesas y liberar las que están bloqueadas
const resetearMesas = () => {
  console.log('🔄 Iniciando reseteo de mesas...');
  
  const query = `
    UPDATE mesas 
    SET ocupada = 0 
    WHERE ocupada = 1
  `;
  
  db.run(query, [], function(err: any) {
    if (err) {
      console.error('❌ Error al resetear mesas:', err);
      return;
    }
    
    console.log(`✅ Se liberaron ${this.changes} mesas`);
    
    // Verificar el estado actual de las mesas
    const verificarQuery = `
      SELECT id, numero, salon, ocupada 
      FROM mesas 
      ORDER BY salon, numero
    `;
    
    db.all(verificarQuery, [], (err: any, rows: any[]) => {
      if (err) {
        console.error('❌ Error al verificar mesas:', err);
        return;
      }
      
      console.log('\n📊 Estado actual de las mesas:');
      console.log('================================');
      rows.forEach((mesa: any) => {
        const estado = mesa.ocupada ? '🔴 OCUPADA' : '🟢 LIBRE';
        console.log(`Mesa ${mesa.numero} (${mesa.salon}): ${estado}`);
      });
      
      console.log('\n✅ Reseteo completado exitosamente');
      process.exit(0);
    });
  });
};

// Ejecutar el reseteo
resetearMesas();
