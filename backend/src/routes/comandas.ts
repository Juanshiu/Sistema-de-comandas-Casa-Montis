import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Comanda, ComandaItem, CreateComandaRequest, Mesa } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { imprimirComanda, probarImpresora } from '../services/printer';

const router = Router();

// Endpoint para probar la impresora
router.get('/test-printer', async (req: Request, res: Response) => {
  try {
    const isConnected = await probarImpresora();
    res.json({ 
      success: true, 
      connected: isConnected, 
      message: isConnected ? 'Impresora conectada y funcionando' : 'Impresora no conectada'
    });
  } catch (error) {
    console.error('Error al probar impresora:', error);
    res.status(500).json({ 
      success: false, 
      connected: false, 
      message: 'Error al probar la impresora',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Endpoint para listar impresoras disponibles
router.get('/list-printers', async (req: Request, res: Response) => {
  try {
    // Ejecutar comando de Windows para listar impresoras
    const { exec } = require('child_process');
    
    exec('wmic printer get name', (error: any, stdout: string, stderr: string) => {
      if (error) {
        console.error('Error al listar impresoras:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al listar impresoras',
          error: error.message
        });
      }
      
      const printers = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line !== 'Name')
        .filter(line => line.length > 0);
      
      res.json({ 
        success: true, 
        printers: printers,
        message: `Se encontraron ${printers.length} impresoras`
      });
    });
  } catch (error) {
    console.error('Error al ejecutar comando:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al ejecutar comando de listado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener todas las comandas
router.get('/', (req: Request, res: Response) => {
  const query = `
    SELECT 
      c.*
    FROM comandas c
    ORDER BY c.fecha_creacion DESC
  `;
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener comandas:', err);
      return res.status(500).json({ error: 'Error al obtener las comandas' });
    }
    
    if (rows.length === 0) {
      return res.json([]);
    }
    
    // Obtener las mesas para cada comanda
    const comandasPromises = rows.map((row: any) => {
      return new Promise((resolve, reject) => {
        const mesasQuery = `
          SELECT m.* 
          FROM mesas m
          INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
          WHERE cm.comanda_id = ?
        `;
        
        db.all(mesasQuery, [row.id], (err: any, mesasRows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const comanda: Comanda = {
            id: row.id,
            mesas: mesasRows.map(mesa => ({
              id: mesa.id,
              numero: mesa.numero,
              capacidad: mesa.capacidad,
              salon: mesa.salon,
              ocupada: mesa.ocupada
            })),
            mesero: row.mesero,
            subtotal: row.subtotal,
            total: row.total,
            estado: row.estado,
            observaciones_generales: row.observaciones_generales,
            fecha_creacion: new Date(row.fecha_creacion),
            fecha_actualizacion: new Date(row.fecha_actualizacion)
          };
          
          resolve(comanda);
        });
      });
    });
    
    Promise.all(comandasPromises)
      .then(comandas => res.json(comandas))
      .catch(err => {
        console.error('Error al obtener mesas de comandas:', err);
        res.status(500).json({ error: 'Error al obtener las comandas' });
      });
  });
});

// Obtener comandas activas (pendientes, preparando, listas)
router.get('/activas', (req: Request, res: Response) => {
  const query = `
    SELECT 
      c.*
    FROM comandas c
    WHERE c.estado IN ('pendiente', 'preparando', 'lista')
    ORDER BY c.fecha_creacion DESC
  `;
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener comandas activas:', err);
      return res.status(500).json({ error: 'Error al obtener las comandas activas' });
    }
    
    if (rows.length === 0) {
      return res.json([]);
    }
    
    // Obtener las mesas para cada comanda
    const comandasPromises = rows.map((row: any) => {
      return new Promise((resolve, reject) => {
        const mesasQuery = `
          SELECT m.* 
          FROM mesas m
          INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
          WHERE cm.comanda_id = ?
        `;
        
        db.all(mesasQuery, [row.id], (err: any, mesasRows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Obtener los items de la comanda
          const itemsQuery = `
            SELECT 
              ci.*,
              p.nombre as producto_nombre,
              p.precio as producto_precio,
              p.categoria as producto_categoria
            FROM comanda_items ci
            JOIN productos p ON ci.producto_id = p.id
            WHERE ci.comanda_id = ?
          `;
          
          db.all(itemsQuery, [row.id], (err: any, itemsRows: any[]) => {
            if (err) {
              reject(err);
              return;
            }
            
            const items = itemsRows.map(itemRow => ({
              id: itemRow.id,
              comanda_id: itemRow.comanda_id,
              producto_id: itemRow.producto_id,
              cantidad: itemRow.cantidad,
              precio_unitario: itemRow.precio_unitario,
              subtotal: itemRow.subtotal,
              observaciones: itemRow.observaciones,
              personalizacion: itemRow.personalizacion ? JSON.parse(itemRow.personalizacion) : null,
              created_at: new Date(itemRow.created_at),
              producto: {
                id: itemRow.producto_id,
                nombre: itemRow.producto_nombre,
                precio: itemRow.producto_precio,
                categoria: itemRow.producto_categoria,
                disponible: true
              }
            }));
            
            const comanda: Comanda = {
              id: row.id,
              mesas: mesasRows.map(mesa => ({
                id: mesa.id,
                numero: mesa.numero,
                capacidad: mesa.capacidad,
                salon: mesa.salon,
                ocupada: mesa.ocupada
              })),
              mesero: row.mesero,
              subtotal: row.subtotal,
              total: row.total,
              estado: row.estado,
              observaciones_generales: row.observaciones_generales,
              fecha_creacion: new Date(row.fecha_creacion),
              fecha_actualizacion: new Date(row.fecha_actualizacion),
              items
            };
            
            resolve(comanda);
          });
        });
      });
    });
    
    Promise.all(comandasPromises)
      .then(comandas => res.json(comandas))
      .catch(err => {
        console.error('Error al obtener mesas de comandas activas:', err);
        res.status(500).json({ error: 'Error al obtener las comandas activas' });
      });
  });
});

// Obtener una comanda específica con sus items
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Obtener la comanda
  const comandaQuery = 'SELECT * FROM comandas WHERE id = ?';
  
  db.get(comandaQuery, [id], (err: any, comandaRow: any) => {
    if (err) {
      console.error('Error al obtener comanda:', err);
      return res.status(500).json({ error: 'Error al obtener la comanda' });
    }
    
    if (!comandaRow) {
      return res.status(404).json({ error: 'Comanda no encontrada' });
    }
    
    // Obtener las mesas de la comanda
    const mesasQuery = `
      SELECT m.* 
      FROM mesas m
      INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
      WHERE cm.comanda_id = ?
    `;
    
    db.all(mesasQuery, [id], (err: any, mesasRows: any[]) => {
      if (err) {
        console.error('Error al obtener mesas de comanda:', err);
        return res.status(500).json({ error: 'Error al obtener las mesas de la comanda' });
      }
      
      // Obtener los items de la comanda
      const itemsQuery = `
        SELECT 
          ci.*,
          p.nombre as producto_nombre,
          p.precio as producto_precio,
          p.categoria as producto_categoria
        FROM comanda_items ci
        JOIN productos p ON ci.producto_id = p.id
        WHERE ci.comanda_id = ?
      `;
      
      db.all(itemsQuery, [id], (err: any, itemsRows: any[]) => {
        if (err) {
          console.error('Error al obtener items de comanda:', err);
          return res.status(500).json({ error: 'Error al obtener los items de la comanda' });
        }
        
        const items: ComandaItem[] = itemsRows.map(row => ({
          id: row.id,
          comanda_id: row.comanda_id,
          producto_id: row.producto_id,
          cantidad: row.cantidad,
          precio_unitario: row.precio_unitario,
          subtotal: row.subtotal,
          observaciones: row.observaciones,
          personalizacion: row.personalizacion ? JSON.parse(row.personalizacion) : null,
          created_at: new Date(row.created_at),
          producto: {
            id: row.producto_id,
            nombre: row.producto_nombre,
            precio: row.producto_precio,
            categoria: row.producto_categoria,
            disponible: true
          }
        }));
        
        const comanda: Comanda = {
          id: comandaRow.id,
          mesas: mesasRows.map(mesa => ({
            id: mesa.id,
            numero: mesa.numero,
            capacidad: mesa.capacidad,
            salon: mesa.salon,
            ocupada: mesa.ocupada
          })),
          mesero: comandaRow.mesero,
          subtotal: comandaRow.subtotal,
          total: comandaRow.total,
          estado: comandaRow.estado,
          observaciones_generales: comandaRow.observaciones_generales,
          fecha_creacion: new Date(comandaRow.fecha_creacion),
          fecha_actualizacion: new Date(comandaRow.fecha_actualizacion),
          items
        };
        
        res.json(comanda);
      });
    });
  });
});

// Crear una nueva comanda
router.post('/', (req: Request, res: Response) => {
  const comandaData: CreateComandaRequest = req.body;
  
  // Validar datos requeridos
  if (!comandaData.mesas || comandaData.mesas.length === 0 || !comandaData.items || comandaData.items.length === 0) {
    return res.status(400).json({ error: 'Faltan datos requeridos: mesas e items' });
  }

  if (!comandaData.mesero || comandaData.mesero.trim() === '') {
    return res.status(400).json({ error: 'El nombre del mesero es requerido' });
  }
  
  const comandaId = uuidv4();
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Insertar comanda
    const insertComandaQuery = `
      INSERT INTO comandas (id, mesero, subtotal, total, observaciones_generales)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(insertComandaQuery, [
      comandaId,
      comandaData.mesero,
      comandaData.subtotal,
      comandaData.total,
      comandaData.observaciones_generales || null
    ], function(err: any) {
      if (err) {
        console.error('Error al insertar comanda:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error al crear la comanda' });
      }
      
      // Insertar relaciones de mesas
      const insertMesaQuery = 'INSERT INTO comanda_mesas (comanda_id, mesa_id) VALUES (?, ?)';
      let mesasInserted = 0;
      let mesasErrors = 0;
      
      comandaData.mesas.forEach((mesa) => {
        db.run(insertMesaQuery, [comandaId, mesa.id], (err: any) => {
          if (err) {
            console.error('Error al relacionar mesa:', err);
            mesasErrors++;
          } else {
            mesasInserted++;
          }
          
          // Verificar si todas las mesas han sido procesadas
          if (mesasInserted + mesasErrors === comandaData.mesas.length) {
            if (mesasErrors > 0) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error al relacionar mesas con la comanda' });
            }
            
            // Marcar mesas como ocupadas
            const updateMesaQuery = 'UPDATE mesas SET ocupada = 1 WHERE id = ?';
            let mesasUpdated = 0;
            let updateErrors = 0;
            
            comandaData.mesas.forEach((mesa) => {
              db.run(updateMesaQuery, [mesa.id], (err: any) => {
                if (err) {
                  console.error('Error al ocupar mesa:', err);
                  updateErrors++;
                } else {
                  mesasUpdated++;
                }
                
                // Verificar si todas las mesas han sido actualizadas
                if (mesasUpdated + updateErrors === comandaData.mesas.length) {
                  if (updateErrors > 0) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al ocupar las mesas' });
                  }
                  
                  // Insertar items
                  const insertItemQuery = `
                    INSERT INTO comanda_items (id, comanda_id, producto_id, cantidad, precio_unitario, subtotal, observaciones, personalizacion)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `;
                  
                  let itemsInserted = 0;
                  let itemsErrors = 0;
                  
                  comandaData.items.forEach((item) => {
                    const itemId = uuidv4();
                    const personalizacionStr = item.personalizacion ? JSON.stringify(item.personalizacion) : null;
                    
                    db.run(insertItemQuery, [
                      itemId,
                      comandaId,
                      item.producto.id,
                      item.cantidad,
                      item.precio_unitario,
                      item.subtotal,
                      item.observaciones || null,
                      personalizacionStr
                    ], (err: any) => {
                      if (err) {
                        console.error('Error al insertar item:', err);
                        itemsErrors++;
                      } else {
                        itemsInserted++;
                      }
                      
                      // Verificar si todos los items han sido procesados
                      if (itemsInserted + itemsErrors === comandaData.items.length) {
                        if (itemsErrors > 0) {
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Error al crear los items de la comanda' });
                        }
                        
                        db.run('COMMIT', (err: any) => {
                          if (err) {
                            console.error('Error al hacer commit:', err);
                            return res.status(500).json({ error: 'Error al guardar la comanda' });
                          }
                          
                          // Obtener la comanda creada
                          const getComandaQuery = 'SELECT * FROM comandas WHERE id = ?';
                          db.get(getComandaQuery, [comandaId], (err: any, comandaRow: any) => {
                            if (err) {
                              console.error('Error al obtener comanda creada:', err);
                              return res.status(500).json({ error: 'Comanda creada pero error al obtener datos' });
                            }
                            
                            const comanda: Comanda = {
                              id: comandaRow.id,
                              mesas: comandaData.mesas,
                              mesero: comandaRow.mesero,
                              subtotal: comandaRow.subtotal,
                              total: comandaRow.total,
                              estado: comandaRow.estado,
                              observaciones_generales: comandaRow.observaciones_generales,
                              fecha_creacion: new Date(comandaRow.fecha_creacion),
                              fecha_actualizacion: new Date(comandaRow.fecha_actualizacion)
                            };
                            
                            // Imprimir comanda
                            try {
                              imprimirComanda(comanda);
                            } catch (error) {
                              console.error('Error al imprimir comanda:', error);
                            }
                            
                            res.status(201).json({
                              message: 'Comanda creada exitosamente',
                              comanda
                            });
                          });
                        });
                      }
                    });
                  });
                }
              });
            });
          }
        });
      });
    });
  });
});

// Actualizar estado de comanda
router.patch('/:id/estado', (req: Request, res: Response) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  const estadosValidos = ['pendiente', 'preparando', 'lista', 'entregada', 'cancelada'];
  
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    const query = 'UPDATE comandas SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [estado, id], function(err: any) {
      if (err) {
        console.error('Error al actualizar estado de comanda:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error al actualizar el estado de la comanda' });
      }
      
      if (this.changes === 0) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Comanda no encontrada' });
      }
      
      // Si el estado es 'entregada', liberar las mesas automáticamente
      if (estado === 'entregada') {
        const getMesasQuery = `
          SELECT mesa_id 
          FROM comanda_mesas 
          WHERE comanda_id = ?
        `;
        
        db.all(getMesasQuery, [id], (err: any, mesaRows: any[]) => {
          if (err) {
            console.error('Error al obtener mesas de comanda:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error al liberar las mesas' });
          }
          
          if (mesaRows.length > 0) {
            const liberarMesaQuery = 'UPDATE mesas SET ocupada = 0 WHERE id = ?';
            let mesasLiberadas = 0;
            let erroresLiberacion = 0;
            
            mesaRows.forEach((mesaRow) => {
              db.run(liberarMesaQuery, [mesaRow.mesa_id], (err: any) => {
                if (err) {
                  console.error('Error al liberar mesa:', err);
                  erroresLiberacion++;
                } else {
                  mesasLiberadas++;
                }
                
                if (mesasLiberadas + erroresLiberacion === mesaRows.length) {
                  if (erroresLiberacion > 0) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al liberar las mesas' });
                  }
                  
                  db.run('COMMIT', (err: any) => {
                    if (err) {
                      console.error('Error al hacer commit:', err);
                      return res.status(500).json({ error: 'Error al actualizar el estado y liberar mesas' });
                    }
                    
                    res.json({ 
                      message: 'Estado de comanda actualizado exitosamente y mesas liberadas',
                      estado: estado,
                      mesasLiberadas: mesasLiberadas
                    });
                  });
                }
              });
            });
          } else {
            // No hay mesas que liberar
            db.run('COMMIT', (err: any) => {
              if (err) {
                console.error('Error al hacer commit:', err);
                return res.status(500).json({ error: 'Error al actualizar el estado' });
              }
              
              res.json({ message: 'Estado de comanda actualizado exitosamente' });
            });
          }
        });
      } else {
        // Para otros estados, solo hacer commit
        db.run('COMMIT', (err: any) => {
          if (err) {
            console.error('Error al hacer commit:', err);
            return res.status(500).json({ error: 'Error al actualizar el estado' });
          }
          
          res.json({ message: 'Estado de comanda actualizado exitosamente' });
        });
      }
    });
  });
});

// Eliminar comanda
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Obtener las mesas de la comanda para liberarlas
    const getMesasQuery = `
      SELECT mesa_id 
      FROM comanda_mesas 
      WHERE comanda_id = ?
    `;
    
    db.all(getMesasQuery, [id], (err: any, mesaRows: any[]) => {
      if (err) {
        console.error('Error al obtener mesas de comanda:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error al obtener las mesas de la comanda' });
      }
      
      // Liberar mesas
      if (mesaRows.length > 0) {
        const liberarMesaQuery = 'UPDATE mesas SET ocupada = 0 WHERE id = ?';
        let mesasLiberadas = 0;
        let erroresLiberacion = 0;
        
        mesaRows.forEach((mesaRow) => {
          db.run(liberarMesaQuery, [mesaRow.mesa_id], (err: any) => {
            if (err) {
              console.error('Error al liberar mesa:', err);
              erroresLiberacion++;
            } else {
              mesasLiberadas++;
            }
            
            if (mesasLiberadas + erroresLiberacion === mesaRows.length) {
              if (erroresLiberacion > 0) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al liberar las mesas' });
              }
              
              // Eliminar comanda (CASCADE eliminará items y relaciones)
              const deleteComandaQuery = 'DELETE FROM comandas WHERE id = ?';
              
              db.run(deleteComandaQuery, [id], function(err: any) {
                if (err) {
                  console.error('Error al eliminar comanda:', err);
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Error al eliminar la comanda' });
                }
                
                if (this.changes === 0) {
                  db.run('ROLLBACK');
                  return res.status(404).json({ error: 'Comanda no encontrada' });
                }
                
                db.run('COMMIT', (err: any) => {
                  if (err) {
                    console.error('Error al hacer commit:', err);
                    return res.status(500).json({ error: 'Error al eliminar la comanda' });
                  }
                  
                  res.json({ message: 'Comanda eliminada exitosamente' });
                });
              });
            }
          });
        });
      } else {
        // No hay mesas que liberar, eliminar directamente
        const deleteComandaQuery = 'DELETE FROM comandas WHERE id = ?';
        
        db.run(deleteComandaQuery, [id], function(err: any) {
          if (err) {
            console.error('Error al eliminar comanda:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error al eliminar la comanda' });
          }
          
          if (this.changes === 0) {
            db.run('ROLLBACK');
            return res.status(404).json({ error: 'Comanda no encontrada' });
          }
          
          db.run('COMMIT', (err: any) => {
            if (err) {
              console.error('Error al hacer commit:', err);
              return res.status(500).json({ error: 'Error al eliminar la comanda' });
            }
            
            res.json({ message: 'Comanda eliminada exitosamente' });
          });
        });
      }
    });
  });
});

// Editar comanda existente (agregar items)
router.patch('/:id/editar', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nuevosItems, observaciones_generales } = req.body;
  
  if (!nuevosItems || nuevosItems.length === 0) {
    return res.status(400).json({ error: 'Se requieren items para agregar' });
  }
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Verificar que la comanda existe y no está cancelada
    const verificarComandaQuery = 'SELECT * FROM comandas WHERE id = ? AND estado != "cancelada"';
    
    db.get(verificarComandaQuery, [id], (err: any, comandaRow: any) => {
      if (err) {
        console.error('Error al verificar comanda:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error al verificar la comanda' });
      }
      
      if (!comandaRow) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Comanda no encontrada o cancelada' });
      }
      
      // Calcular nuevos totales
      let nuevoSubtotal = parseFloat(comandaRow.subtotal);
      let nuevoTotal = parseFloat(comandaRow.total);
      
      nuevosItems.forEach((item: any) => {
        nuevoSubtotal += item.subtotal;
        nuevoTotal += item.subtotal;
      });
      
      // Insertar nuevos items
      const insertItemQuery = `
        INSERT INTO comanda_items (id, comanda_id, producto_id, cantidad, precio_unitario, subtotal, observaciones, personalizacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      let itemsInserted = 0;
      let itemsErrors = 0;
      
      nuevosItems.forEach((item: any) => {
        const itemId = require('uuid').v4();
        const personalizacionStr = item.personalizacion ? JSON.stringify(item.personalizacion) : null;
        
        db.run(insertItemQuery, [
          itemId,
          id,
          item.producto.id,
          item.cantidad,
          item.precio_unitario,
          item.subtotal,
          item.observaciones || null,
          personalizacionStr
        ], (err: any) => {
          if (err) {
            console.error('Error al insertar nuevo item:', err);
            itemsErrors++;
          } else {
            itemsInserted++;
          }
          
          if (itemsInserted + itemsErrors === nuevosItems.length) {
            if (itemsErrors > 0) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error al agregar algunos items' });
            }
            
            // Actualizar totales de la comanda
            const updateComandaQuery = `
              UPDATE comandas 
              SET subtotal = ?, total = ?, observaciones_generales = ?, fecha_actualizacion = CURRENT_TIMESTAMP 
              WHERE id = ?
            `;
            
            db.run(updateComandaQuery, [nuevoSubtotal, nuevoTotal, observaciones_generales || comandaRow.observaciones_generales, id], (err: any) => {
              if (err) {
                console.error('Error al actualizar totales de comanda:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al actualizar la comanda' });
              }
              
              db.run('COMMIT', (err: any) => {
                if (err) {
                  console.error('Error al hacer commit:', err);
                  return res.status(500).json({ error: 'Error al guardar los cambios' });
                }
                
                res.json({ 
                  message: 'Comanda actualizada exitosamente',
                  itemsAgregados: itemsInserted,
                  nuevoTotal: nuevoTotal
                });
              });
            });
          }
        });
      });
    });
  });
});

export default router;
