import { Router } from 'express';
import { db } from '../database/init';
import { fullDatabaseReset } from '../database/reset';

const router = Router();

// Resetear base de datos completa
router.post('/resetear-base-datos', async (req, res) => {
  try {
    await fullDatabaseReset();
    res.json({ 
      success: true, 
      mensaje: 'Base de datos reseteada exitosamente' 
    });
  } catch (err: any) {
    console.error('Error al resetear base de datos:', err);
    res.status(500).json({ 
      error: 'Error al resetear base de datos',
      detalles: err.message 
    });
  }
});

// Liberar todas las mesas
router.post('/liberar-mesas', (req, res) => {
  console.log('🔓 Iniciando liberación de todas las mesas...');
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // 1. Obtener IDs de comandas activas antes de eliminarlas
    db.all(`
      SELECT DISTINCT c.id 
      FROM comandas c 
      WHERE c.estado IN ('pendiente', 'preparando', 'lista', 'entregada')
    `, [], (err: any, comandasActivas: any[]) => {
      if (err) {
        console.error('❌ Error al obtener comandas activas:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ 
          error: 'Error al obtener comandas activas',
          detalles: err.message 
        });
      }
      
      const comandaIds = comandasActivas.map((c: any) => c.id);
      
      // 2. Eliminar registros relacionados de comandas activas
      if (comandaIds.length > 0) {
        const placeholders = comandaIds.map(() => '?').join(',');
        
        // Eliminar items de comandas
        db.run(`DELETE FROM comanda_items WHERE comanda_id IN (${placeholders})`, comandaIds, (err: any) => {
          if (err) {
            console.error('❌ Error al eliminar items de comandas:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ 
              error: 'Error al eliminar items de comandas',
              detalles: err.message 
            });
          }
          
          // Eliminar relación mesa-comanda
          db.run(`DELETE FROM comanda_mesas WHERE comanda_id IN (${placeholders})`, comandaIds, (err: any) => {
            if (err) {
              console.error('❌ Error al eliminar relaciones mesa-comanda:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ 
                error: 'Error al eliminar relaciones mesa-comanda',
                detalles: err.message 
              });
            }
            
            // Eliminar comandas
            db.run(`DELETE FROM comandas WHERE id IN (${placeholders})`, comandaIds, function(err: any) {
              if (err) {
                console.error('❌ Error al eliminar comandas:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ 
                  error: 'Error al eliminar comandas',
                  detalles: err.message 
                });
              }
              
              const comandasEliminadas = this.changes;
              console.log(`✅ Comandas eliminadas: ${comandasEliminadas}`);
              
              // 3. Liberar las mesas
              liberarMesas(comandasEliminadas, res);
            });
          });
        });
      } else {
        // Si no hay comandas activas, solo liberar mesas
        liberarMesas(0, res);
      }
    });
    
    // Función auxiliar para liberar mesas
    function liberarMesas(comandasEliminadas: number, res: any) {
      const query = 'UPDATE mesas SET ocupada = 0 WHERE ocupada = 1';
      
      db.run(query, function(err: any) {
        if (err) {
          console.error('❌ Error al liberar mesas:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ 
            error: 'Error al liberar mesas',
            detalles: err.message 
          });
        }
        
        const mesasLiberadas = this.changes;
        console.log(`✅ Mesas liberadas: ${mesasLiberadas}`);
        
        db.run('COMMIT', (commitErr: any) => {
          if (commitErr) {
            console.error('❌ Error al hacer commit:', commitErr);
            return res.status(500).json({ 
              error: 'Error al confirmar liberación',
              detalles: commitErr.message 
            });
          }
          
          res.json({ 
            success: true, 
            mensaje: `${mesasLiberadas} mesa(s) liberada(s) y ${comandasEliminadas} comanda(s) eliminada(s) exitosamente`,
            mesasLiberadas: mesasLiberadas,
            comandasEliminadas: comandasEliminadas
          });
        });
      });
    }
  });
});

// Limpiar comandas antiguas (más de 30 días)
router.post('/limpiar-comandas-antiguas', (req, res) => {
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  const fechaLimite = hace30Dias.toISOString().split('T')[0];

  console.log(`🗑️  Limpiando comandas anteriores a: ${fechaLimite}`);

  const detectarColumnaFecha = (tabla: string, cb: (err: any, columna?: string) => void) => {
    db.all(`PRAGMA table_info(${tabla})`, [], (err: any, columns: any[]) => {
      if (err) {
        cb(err);
        return;
      }

      const nombres = (columns || []).map((col) => col.name);
      const columna = nombres.includes('fecha_creacion')
        ? 'fecha_creacion'
        : nombres.includes('fecha')
        ? 'fecha'
        : nombres.includes('created_at')
        ? 'created_at'
        : undefined;

      cb(null, columna);
    });
  };

  detectarColumnaFecha('comandas', (errComandasInfo, columnaComandas) => {
    if (errComandasInfo || !columnaComandas) {
      console.error('Error al detectar columna de fecha en comandas:', errComandasInfo);
      return res.status(500).json({ 
        error: 'Error al detectar columna de fecha en comandas',
        detalles: errComandasInfo?.message || 'Columna de fecha no encontrada'
      });
    }

    detectarColumnaFecha('facturas', (errFacturasInfo, columnaFacturas) => {
      if (errFacturasInfo || !columnaFacturas) {
        console.error('Error al detectar columna de fecha en facturas:', errFacturasInfo);
        return res.status(500).json({ 
          error: 'Error al detectar columna de fecha en facturas',
          detalles: errFacturasInfo?.message || 'Columna de fecha no encontrada'
        });
      }

      // Primero eliminamos comandas antiguas
      const queryComandas = `DELETE FROM comandas WHERE DATE(${columnaComandas}) <= DATE(?)`;
      
      db.run(queryComandas, [fechaLimite], function(errComandas: any) {
        if (errComandas) {
          console.error('Error al limpiar comandas antiguas:', errComandas);
          return res.status(500).json({ 
            error: 'Error al limpiar comandas antiguas',
            detalles: errComandas.message 
          });
        }

        const comandasEliminadas = this.changes;
        console.log(`✅ Comandas eliminadas: ${comandasEliminadas}`);

        // Luego eliminamos facturas antiguas
        const queryFacturas = `DELETE FROM facturas WHERE DATE(${columnaFacturas}) <= DATE(?)`;
        
        db.run(queryFacturas, [fechaLimite], function(errFacturas: any) {
          if (errFacturas) {
            console.error('Error al limpiar facturas antiguas:', errFacturas);
            return res.status(500).json({ 
              error: 'Error al limpiar facturas antiguas',
              detalles: errFacturas.message 
            });
          }

          const facturasEliminadas = this.changes;
          const totalEliminadas = comandasEliminadas + facturasEliminadas;
          console.log(`✅ Facturas eliminadas: ${facturasEliminadas}`);
          console.log(`✅ Total registros eliminados: ${totalEliminadas}`);

          res.json({ 
            success: true, 
            mensaje: `Se eliminaron ${totalEliminadas} registros antiguos`,
            eliminadas: totalEliminadas,
            comandas: comandasEliminadas,
            facturas: facturasEliminadas
          });
        });
      });
    });
  });
});

// Limpiar SOLO comandas (todas)
router.post('/limpiar-solo-comandas', (req, res) => {
  console.log('🗑️  Limpiando TODAS las comandas y facturas...');

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Eliminar items de comandas
    db.run('DELETE FROM comanda_items', function(err: any) {
      if (err) {
        console.error('❌ Error al eliminar items de comandas:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ 
          error: 'Error al eliminar items de comandas',
          detalles: err.message 
        });
      }

      const itemsEliminados = this.changes;
      console.log(`✅ Items de comandas eliminados: ${itemsEliminados}`);

      // 2. Eliminar relación mesa-comanda
      db.run('DELETE FROM comanda_mesas', function(err: any) {
        if (err) {
          console.error('❌ Error al eliminar relaciones mesa-comanda:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ 
            error: 'Error al eliminar relaciones mesa-comanda',
            detalles: err.message 
          });
        }

        console.log(`✅ Relaciones mesa-comanda eliminadas: ${this.changes}`);

        // 3. Eliminar todas las comandas
        db.run('DELETE FROM comandas', function(err: any) {
          if (err) {
            console.error('❌ Error al eliminar comandas:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ 
              error: 'Error al eliminar comandas',
              detalles: err.message 
            });
          }

          const comandasEliminadas = this.changes;
          console.log(`✅ Comandas eliminadas: ${comandasEliminadas}`);

          // 4. Eliminar todas las facturas
          db.run('DELETE FROM facturas', function(err: any) {
            if (err) {
              console.error('❌ Error al eliminar facturas:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ 
                error: 'Error al eliminar facturas',
                detalles: err.message 
              });
            }

            const facturasEliminadas = this.changes;
            console.log(`✅ Facturas eliminadas: ${facturasEliminadas}`);

            // 5. Liberar todas las mesas
            db.run('UPDATE mesas SET ocupada = 0 WHERE ocupada = 1', function(err: any) {
              if (err) {
                console.error('❌ Error al liberar mesas:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ 
                  error: 'Error al liberar mesas',
                  detalles: err.message 
                });
              }

              const mesasLiberadas = this.changes;
              console.log(`✅ Mesas liberadas: ${mesasLiberadas}`);

              // 6. Commit de la transacción
              db.run('COMMIT', (commitErr: any) => {
                if (commitErr) {
                  console.error('❌ Error al hacer commit:', commitErr);
                  return res.status(500).json({ 
                    error: 'Error al confirmar limpieza',
                    detalles: commitErr.message 
                  });
                }

                res.json({ 
                  success: true, 
                  mensaje: 'Todas las comandas y facturas fueron eliminadas exitosamente',
                  comandas: comandasEliminadas,
                  facturas: facturasEliminadas,
                  items: itemsEliminados,
                  mesasLiberadas: mesasLiberadas
                });
              });
            });
          });
        });
      });
    });
  });
});

export default router;
