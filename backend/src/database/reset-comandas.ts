import { db } from './init';

// Script para resetear comandas que están en estado inconsistente
const resetearComandas = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔄 Iniciando reseteo de comandas...');
      
      // Primero, obtener todas las comandas activas
      const comandasQuery = `
        SELECT c.*, 
               GROUP_CONCAT(m.numero || ' (' || m.salon || ')') as mesas_info
        FROM comandas c
        LEFT JOIN comanda_mesas cm ON c.id = cm.comanda_id
        LEFT JOIN mesas m ON cm.mesa_id = m.id
        WHERE c.estado IN ('pendiente', 'preparando', 'lista')
        GROUP BY c.id
      `;
      
      db.all(comandasQuery, (err, comandas) => {
        if (err) {
          console.error('❌ Error al obtener comandas:', err);
          return reject(err);
        }
        
        if (!comandas || comandas.length === 0) {
          console.log('✅ No hay comandas activas para resetear');
          return resolve();
        }
        
        console.log(`📋 Encontradas ${comandas.length} comandas activas:`);
        comandas.forEach((comanda: any) => {
          console.log(`  - ID: ${comanda.id.substring(0, 8)}... | Estado: ${comanda.estado} | Mesas: ${comanda.mesas_info || 'Sin mesas'} | Mesero: ${comanda.mesero}`);
        });
        
        // Preguntar por consola qué hacer
        console.log('\n🤔 ¿Qué deseas hacer?');
        console.log('1. Eliminar todas las comandas activas');
        console.log('2. Cambiar estado a "facturada" (mantener registro)');
        console.log('3. Cancelar operación');
        
        // Para automatizar, vamos a eliminar las comandas activas
        const eliminarComandas = () => {
          db.run('BEGIN TRANSACTION');
          
          let comandasEliminadas = 0;
          let errores = 0;
          
          comandas.forEach((comanda: any) => {
            // Eliminar items de la comanda
            db.run(`DELETE FROM comanda_items WHERE comanda_id = ?`, [comanda.id], (err) => {
              if (err) {
                console.error(`❌ Error al eliminar items de comanda ${comanda.id}:`, err);
                errores++;
              }
              
              // Eliminar relaciones comanda-mesas
              db.run(`DELETE FROM comanda_mesas WHERE comanda_id = ?`, [comanda.id], (err) => {
                if (err) {
                  console.error(`❌ Error al eliminar relaciones mesa de comanda ${comanda.id}:`, err);
                  errores++;
                }
                
                // Eliminar la comanda
                db.run(`DELETE FROM comandas WHERE id = ?`, [comanda.id], (err) => {
                  if (err) {
                    console.error(`❌ Error al eliminar comanda ${comanda.id}:`, err);
                    errores++;
                  } else {
                    comandasEliminadas++;
                    console.log(`✅ Comanda ${comanda.id.substring(0, 8)}... eliminada`);
                  }
                  
                  if (comandasEliminadas + errores === comandas.length) {
                    if (errores > 0) {
                      console.error(`❌ ${errores} errores durante la eliminación`);
                      db.run('ROLLBACK');
                      return reject(new Error(`${errores} errores durante la eliminación`));
                    }
                    
                    // Liberar todas las mesas
                    db.run(`UPDATE mesas SET ocupada = 0`, (err) => {
                      if (err) {
                        console.error('❌ Error al liberar mesas:', err);
                        db.run('ROLLBACK');
                        return reject(err);
                      }
                      
                      db.run('COMMIT', (err) => {
                        if (err) {
                          console.error('❌ Error al hacer commit:', err);
                          return reject(err);
                        }
                        
                        console.log(`✅ ${comandasEliminadas} comandas eliminadas y todas las mesas liberadas`);
                        resolve();
                      });
                    });
                  }
                });
              });
            });
          });
        };
        
        // Ejecutar eliminación
        eliminarComandas();
      });
    });
  });
};

// Función para resetear solo una comanda específica
const resetearComandaEspecifica = async (comandaId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log(`🔄 Reseteando comanda específica: ${comandaId}`);
      
      db.run('BEGIN TRANSACTION');
      
      // Obtener mesas de la comanda antes de eliminar
      db.all(`
        SELECT mesa_id FROM comanda_mesas WHERE comanda_id = ?
      `, [comandaId], (err, mesas) => {
        if (err) {
          console.error('❌ Error al obtener mesas de comanda:', err);
          db.run('ROLLBACK');
          return reject(err);
        }
        
        // Eliminar items de la comanda
        db.run(`DELETE FROM comanda_items WHERE comanda_id = ?`, [comandaId], (err) => {
          if (err) {
            console.error('❌ Error al eliminar items:', err);
            db.run('ROLLBACK');
            return reject(err);
          }
          
          // Eliminar relaciones comanda-mesas
          db.run(`DELETE FROM comanda_mesas WHERE comanda_id = ?`, [comandaId], (err) => {
            if (err) {
              console.error('❌ Error al eliminar relaciones mesa:', err);
              db.run('ROLLBACK');
              return reject(err);
            }
            
            // Eliminar la comanda
            db.run(`DELETE FROM comandas WHERE id = ?`, [comandaId], (err) => {
              if (err) {
                console.error('❌ Error al eliminar comanda:', err);
                db.run('ROLLBACK');
                return reject(err);
              }
              
              // Liberar las mesas que estaban asignadas
              if (mesas && mesas.length > 0) {
                const mesaIds = mesas.map((m: any) => m.mesa_id);
                const placeholders = mesaIds.map(() => '?').join(',');
                
                db.run(`UPDATE mesas SET ocupada = 0 WHERE id IN (${placeholders})`, mesaIds, (err) => {
                  if (err) {
                    console.error('❌ Error al liberar mesas:', err);
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                  
                  db.run('COMMIT', (err) => {
                    if (err) {
                      console.error('❌ Error al hacer commit:', err);
                      return reject(err);
                    }
                    
                    console.log(`✅ Comanda ${comandaId} reseteada y ${mesas.length} mesas liberadas`);
                    resolve();
                  });
                });
              } else {
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('❌ Error al hacer commit:', err);
                    return reject(err);
                  }
                  
                  console.log(`✅ Comanda ${comandaId} reseteada`);
                  resolve();
                });
              }
            });
          });
        });
      });
    });
  });
};

// Ejecutar si es llamado directamente
if (require.main === module) {
  resetearComandas()
    .then(() => {
      console.log('✅ Reseteo de comandas completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en reseteo de comandas:', error);
      process.exit(1);
    });
}

export { resetearComandas, resetearComandaEspecifica };
