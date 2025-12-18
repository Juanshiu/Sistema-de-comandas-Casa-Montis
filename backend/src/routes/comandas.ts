import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Comanda, ComandaItem, CreateComandaRequest, Mesa } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { imprimirComanda, probarImpresora } from '../services/printer';

const router = Router();

// Función auxiliar para obtener fecha en zona horaria de Colombia
const getFechaColombia = (): string => {
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

// Endpoint para probar la impresora
router.get('/test-printer', async (req: Request, res: Response) => {
  try {
    console.log('🧪 ENDPOINT DE PRUEBA DE IMPRESIÓN LLAMADO');
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

// Endpoint de prueba para verificar impresión automática
router.post('/test-print-edited', async (req: Request, res: Response) => {
  try {
    console.log('🧪 ENDPOINT DE PRUEBA DE IMPRESIÓN AUTOMÁTICA LLAMADO');
    
    const comandaPrueba = {
      id: 'test-comanda-123',
      mesero: 'Mesero de Prueba',
      mesas: [{ salon: 'Principal', numero: '1' }],
      items: [
        {
          cantidad: 2,
          producto: { nombre: 'Producto de Prueba' },
          precio_unitario: 10000,
          subtotal: 20000,
          observaciones: 'Esta es una prueba de impresión automática'
        }
      ],
      subtotal: 20000,
      total: 20000,
      observaciones_generales: '🔄 COMANDA EDITADA - NUEVA ORDEN (PRUEBA)',
      fecha_creacion: new Date()
    };
    
    console.log('🚀 Llamando al servicio de impresión para prueba...');
    const { imprimirComanda } = require('../services/printer');
    await imprimirComanda(comandaPrueba);
    
    console.log('✅ Prueba de impresión completada');
    res.json({ 
      success: true, 
      message: 'Prueba de impresión automática completada'
    });
  } catch (error) {
    console.error('❌ Error en prueba de impresión:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en prueba de impresión',
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

// Historial de comandas por día
router.get('/historial', async (req, res) => {
  try {
    const { fecha } = req.query;
    
    let query = `
      SELECT 
        c.id,
        c.fecha_creacion as fecha,
        c.mesero,
        c.subtotal,
        c.total,
        c.estado,
        c.observaciones_generales,
        GROUP_CONCAT(DISTINCT m.salon || ' - ' || m.numero) as mesas
      FROM comandas c
      LEFT JOIN comanda_mesas cm ON c.id = cm.comanda_id
      LEFT JOIN mesas m ON cm.mesa_id = m.id
    `;
    
    let params: any[] = [];
    
    if (fecha) {
      query += ` WHERE DATE(c.fecha_creacion) = ?`;
      params.push(fecha);
    }
    
    query += ` 
      GROUP BY c.id
      ORDER BY c.fecha_creacion DESC
    `;
    
    console.log('🔍 Ejecutando query historial:', query);
    console.log('📅 Parámetros:', params);
    
    const comandas = await new Promise<any[]>((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('❌ Error en query historial:', err);
          reject(err);
        } else {
          console.log('✅ Comandas encontradas:', rows ? (rows as any[]).length : 0);
          resolve(rows as any[]);
        }
      });
    });
    
    if (!comandas || comandas.length === 0) {
      console.log('⚠️  No se encontraron comandas');
      return res.json([]);
    }
    
    // Obtener items para cada comanda
    const comandasConItems = await Promise.all(
      comandas.map(async (comanda: any) => {
        const items = await new Promise<any[]>((resolve, reject) => {
          db.all(`
            SELECT 
              ci.id,
              ci.cantidad,
              ci.precio_unitario,
              ci.subtotal,
              ci.observaciones,
              p.nombre as producto_nombre,
              ci.personalizacion
            FROM comanda_items ci
            JOIN productos p ON ci.producto_id = p.id
            WHERE ci.comanda_id = ?
            ORDER BY ci.id
          `, [comanda.id], (err, rows) => {
            if (err) {
              console.error('❌ Error obteniendo items:', err);
              reject(err);
            } else {
              resolve(rows as any[]);
            }
          });
        });
        
        return {
          ...comanda,
          items: items.map((item: any) => ({
            ...item,
            personalizacion: item.personalizacion ? JSON.parse(item.personalizacion) : null
          }))
        };
      })
    );
    
    console.log('📊 Enviando', comandasConItems.length, 'comandas con items');
    res.json(comandasConItems);
  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial de comandas' });
  }
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
    const fechaColombia = getFechaColombia();
    
    const insertComandaQuery = `
      INSERT INTO comandas (id, mesero, subtotal, total, observaciones_generales, fecha_creacion, fecha_actualizacion)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(insertComandaQuery, [
      comandaId,
      comandaData.mesero,
      comandaData.subtotal,
      comandaData.total,
      comandaData.observaciones_generales || null,
      fechaColombia,
      fechaColombia
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
    
    const fechaColombia = getFechaColombia();
    
    const query = 'UPDATE comandas SET estado = ?, fecha_actualizacion = ? WHERE id = ?';
    
    db.run(query, [estado, fechaColombia, id], function(err: any) {
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

// Editar comanda existente (reemplazar items completamente)
router.put('/:id/editar', (req: Request, res: Response) => {
  const { id } = req.params;
  const { items, observaciones_generales, imprimir_adicionales } = req.body;
  
  console.log(`🔧 INICIANDO EDICIÓN DE COMANDA: ${id}`);
  console.log(`📦 Items recibidos: ${items ? items.length : 0}`);
  console.log(`🖨️  Imprimir adicionales: ${imprimir_adicionales ? 'SÍ' : 'NO'}`);
  
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Se requieren items para la comanda' });
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
      
      // Obtener items existentes antes de eliminarlos para saber cuáles son nuevos
      const getItemsExistentesQuery = `
        SELECT 
          ci.producto_id,
          p.nombre as producto_nombre,
          SUM(ci.cantidad) as cantidad_total
        FROM comanda_items ci
        JOIN productos p ON ci.producto_id = p.id
        WHERE ci.comanda_id = ?
        GROUP BY ci.producto_id, p.nombre
      `;
      
      db.all(getItemsExistentesQuery, [id], (err: any, itemsExistentes: any[]) => {
        if (err) {
          console.error('Error al obtener items existentes:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error al verificar items existentes' });
        }
        
        console.log('📋 Items existentes en BD:', itemsExistentes);
        
        // Crear mapa de items existentes
        const mapaItemsExistentes = new Map();
        itemsExistentes.forEach(item => {
          mapaItemsExistentes.set(item.producto_id, {
            cantidad: item.cantidad_total,
            nombre: item.producto_nombre
          });
        });
        
        // Contar items nuevos por producto
        const mapaItemsNuevos = new Map();
        items.forEach((item: any) => {
          const productoId = item.producto.id;
          const cantidadActual = mapaItemsNuevos.get(productoId) || 0;
          mapaItemsNuevos.set(productoId, cantidadActual + item.cantidad);
        });
        
        // Identificar solo los items ADICIONALES (nuevos)
        const itemsAdicionales: any[] = [];
        
        mapaItemsNuevos.forEach((cantidadNueva, productoId) => {
          const itemExistente = mapaItemsExistentes.get(productoId);
          const cantidadExistente = itemExistente ? itemExistente.cantidad : 0;
          
          if (cantidadNueva > cantidadExistente) {
            const cantidadAdicional = cantidadNueva - cantidadExistente;
            
            // Buscar el item completo en la lista de items nuevos
            const itemCompleto = items.find((item: any) => item.producto.id === productoId);
            
            if (itemCompleto) {
              itemsAdicionales.push({
                ...itemCompleto,
                cantidad: cantidadAdicional
              });
            }
          }
        });
        
        console.log('🆕 Items adicionales identificados:', itemsAdicionales.length);
        itemsAdicionales.forEach(item => {
          console.log(`   - ${item.cantidad}x ${item.producto.nombre}`);
        });
      
      // Eliminar todos los items existentes
      const deleteItemsQuery = 'DELETE FROM comanda_items WHERE comanda_id = ?';
      
      db.run(deleteItemsQuery, [id], (err: any) => {
        if (err) {
          console.error('Error al eliminar items existentes:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error al actualizar la comanda' });
        }
        
        // Calcular nuevos totales
        let nuevoSubtotal = 0;
        let nuevoTotal = 0;
        
        items.forEach((item: any) => {
          nuevoSubtotal += item.subtotal;
          nuevoTotal += item.subtotal;
        });
        
        // Insertar todos los items (incluyendo los nuevos)
        const insertItemQuery = `
          INSERT INTO comanda_items (id, comanda_id, producto_id, cantidad, precio_unitario, subtotal, observaciones, personalizacion)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        let itemsInserted = 0;
        let itemsErrors = 0;
        // Todos los items son nuevos ya que eliminamos los existentes antes
        const nuevosItems = items;
        
        items.forEach((item: any) => {
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
              console.error('Error al insertar item:', err);
              itemsErrors++;
            } else {
              itemsInserted++;
            }
            
            if (itemsInserted + itemsErrors === items.length) {
              if (itemsErrors > 0) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al agregar algunos items' });
              }
              
              // Actualizar totales de la comanda
              const nuevoSubtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
              const nuevoTotal = nuevoSubtotal; // Asumiendo que no hay otros recargos
              
              const updateComandaQuery = `
                UPDATE comandas 
                SET subtotal = ?, total = ?, observaciones_generales = ?, fecha_actualizacion = ? 
                WHERE id = ?
              `;
              
              const fechaActualizacion = getFechaColombia();
              
              db.run(updateComandaQuery, [
                nuevoSubtotal, 
                nuevoTotal, 
                observaciones_generales || comandaRow.observaciones_generales, 
                fechaActualizacion,
                id
              ], (err: any) => {
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
                  
                  console.log(`✅ Comanda ${id} actualizada exitosamente`);
                  console.log(`📊 Items totales: ${itemsInserted}`);
                  
                  // Solo imprimir si hay items adicionales Y se solicitó imprimirlos
                  if (itemsAdicionales.length > 0 && imprimir_adicionales === true) {
                    console.log(`🖨️  INICIANDO IMPRESIÓN AUTOMÁTICA...`);
                    console.log(`🖨️  Imprimiendo ${itemsAdicionales.length} items ADICIONALES...`);
                  
                  // Obtener información completa de la comanda para imprimir
                  const comandaQuery = `
                    SELECT c.*, 
                           GROUP_CONCAT(m.salon || ' - ' || m.numero) as mesas_info
                    FROM comandas c
                    LEFT JOIN comanda_mesas cm ON c.id = cm.comanda_id
                    LEFT JOIN mesas m ON cm.mesa_id = m.id
                    WHERE c.id = ?
                    GROUP BY c.id
                  `;
                  
                  db.get(comandaQuery, [id], async (err: any, comandaRow: any) => {
                    if (err) {
                      console.error('Error al obtener datos para impresión:', err);
                      return;
                    }
                    
                    try {
                      // Crear objeto para impresión con SOLO los items adicionales
                      const comandaParaImprimir = {
                        id: comandaRow.id,
                        mesero: comandaRow.mesero,
                        mesas: [{ salon: 'Mesa', numero: comandaRow.mesas_info || 'N/A' }],
                        items: itemsAdicionales,
                        subtotal: itemsAdicionales.reduce((sum: number, item: any) => sum + item.subtotal, 0),
                        total: itemsAdicionales.reduce((sum: number, item: any) => sum + item.subtotal, 0),
                        observaciones_generales: '🆕 ITEMS ADICIONALES',
                        fecha_creacion: new Date()
                      };
                      
                      console.log('🔄 Preparando datos para impresión...');
                      console.log('📝 Items adicionales a imprimir:', itemsAdicionales.length);
                      console.log('🚀 Llamando al servicio de impresión...');
                      
                      // Usar servicio de impresión
                      const { imprimirComanda } = require('../services/printer');
                      await imprimirComanda(comandaParaImprimir);
                      
                      console.log('✅ Comanda editada impresa automáticamente');
                    } catch (printError) {
                      console.error('❌ Error al imprimir automáticamente:', printError);
                      
                      // Fallback: imprimir en consola
                      console.log('\n' + '='.repeat(50));
                      console.log('           CASA MONTIS');
                      console.log('       COMANDA EDITADA');
                      console.log('='.repeat(50));
                      console.log(`Comanda: ${comandaRow.id.substring(0, 8)}...`);
                      console.log(`Mesa(s): ${comandaRow.mesas_info}`);
                      console.log(`Mesero: ${comandaRow.mesero}`);
                      console.log('='.repeat(50));
                      
                      items.forEach((item: any) => {
                        console.log(`${item.cantidad}x ${item.producto.nombre} - $${item.subtotal.toLocaleString('es-CO')}`);
                        if (item.personalizacion) {
                          if (item.personalizacion.caldo) console.log(`     🥄 Caldo: ${item.personalizacion.caldo.nombre}`);
                          if (item.personalizacion.principio) console.log(`     🍽️ Principio: ${item.personalizacion.principio.nombre}`);
                          if (item.personalizacion.proteina) console.log(`     🥩 Proteína: ${item.personalizacion.proteina.nombre}`);
                          if (item.personalizacion.bebida) console.log(`     ☕ Bebida: ${item.personalizacion.bebida.nombre}`);
                        }
                        if (item.observaciones) {
                          console.log(`     📝 Obs: ${item.observaciones}`);
                        }
                      });
                      
                      console.log('='.repeat(50));
                      console.log('✅ Items adicionales enviados a cocina');
                      console.log('='.repeat(50));
                    }
                  });
                  } else if (itemsAdicionales.length > 0 && imprimir_adicionales === false) {
                    console.log(`ℹ️  Se agregaron ${itemsAdicionales.length} items adicionales pero NO se imprimieron (por solicitud del usuario)`);
                  } else {
                    console.log('ℹ️  No hay items adicionales para imprimir');
                  }
                  
                  const mensajeRespuesta = itemsAdicionales.length > 0 && imprimir_adicionales === true
                    ? 'Comanda actualizada exitosamente e impresa automáticamente'
                    : 'Comanda actualizada exitosamente';
                  
                  res.json({ 
                    message: mensajeRespuesta,
                    itemsAgregados: itemsInserted,
                    itemsAdicionales: itemsAdicionales.length,
                    impreso: itemsAdicionales.length > 0 && imprimir_adicionales === true
                  });
                });
              });
            }
          });
        });
        });
      });
    });
  });
});

// Editar comanda existente (agregar items) - Método original para compatibilidad
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
              SET subtotal = ?, total = ?, observaciones_generales = ?, fecha_actualizacion = ? 
              WHERE id = ?
            `;
            
            const fechaActualizacion = getFechaColombia();
            
            db.run(updateComandaQuery, [nuevoSubtotal, nuevoTotal, observaciones_generales || comandaRow.observaciones_generales, fechaActualizacion, id], (err: any) => {
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

// Imprimir solo los nuevos items de una comanda editada
router.post('/:id/imprimir-nuevos', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nuevosItems } = req.body;
    
    if (!nuevosItems || nuevosItems.length === 0) {
      return res.status(400).json({ error: 'No hay items nuevos para imprimir' });
    }
    
    console.log(`📝 Imprimiendo ${nuevosItems.length} items nuevos para comanda ${id}`);
    
    // Obtener información de la comanda
    const comandaQuery = `
      SELECT c.*, 
             GROUP_CONCAT(m.salon || ' - ' || m.numero) as mesas_info
      FROM comandas c
      LEFT JOIN comanda_mesas cm ON c.id = cm.comanda_id
      LEFT JOIN mesas m ON cm.mesa_id = m.id
      WHERE c.id = ?
      GROUP BY c.id
    `;
    
    const comanda = await new Promise((resolve, reject) => {
      db.get(comandaQuery, [id], (err: any, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!comanda) {
      return res.status(404).json({ error: 'Comanda no encontrada' });
    }
    
    // Crear objeto para imprimir solo los nuevos items
    const comandaParaImprimir = {
      id: (comanda as any).id,
      mesero: (comanda as any).mesero,
      mesas: [{ salon: 'Mesa', numero: (comanda as any).mesas_info || 'N/A' }],
      items: nuevosItems,
      subtotal: nuevosItems.reduce((sum: number, item: any) => sum + item.subtotal, 0),
      total: nuevosItems.reduce((sum: number, item: any) => sum + item.subtotal, 0),
      observaciones_generales: '⚠️ ITEMS ADICIONALES - COMANDA EDITADA',
      fecha_creacion: new Date()
    };
    
    try {
      // Usar el servicio de impresión
      const { imprimirComanda } = require('../services/printer');
      await imprimirComanda(comandaParaImprimir);
      
      console.log('✅ Items nuevos enviados a impresora');
      res.json({ message: 'Items nuevos impresos exitosamente' });
    } catch (printError) {
      console.error('Error al imprimir físicamente:', printError);
      
      // Fallback: imprimir en consola
      console.log('\n' + '='.repeat(50));
      console.log('           CASA MONTIS');
      console.log('        ITEMS ADICIONALES');
      console.log('='.repeat(50));
      console.log(`Comanda ID: ${(comanda as any).id.substring(0, 8)}...`);
      console.log(`Mesa(s): ${(comanda as any).mesas_info}`);
      console.log(`Mesero: ${(comanda as any).mesero}`);
      console.log(`Fecha: ${new Date().toLocaleString('es-CO')}`);
      console.log('='.repeat(50));
      console.log('NUEVOS PRODUCTOS AGREGADOS:');
      console.log('-'.repeat(50));
      
      nuevosItems.forEach((item: any) => {
        console.log(`${item.cantidad}x ${item.producto?.nombre || item.producto_nombre || 'Producto'}`);
        console.log(`   $${item.precio_unitario.toLocaleString('es-CO')} c/u = $${item.subtotal.toLocaleString('es-CO')}`);
        
        if (item.personalizacion) {
          console.log('   PERSONALIZACION:');
          if (item.personalizacion.caldo) console.log(`     🥄 Caldo: ${item.personalizacion.caldo.nombre}`);
          if (item.personalizacion.principio) console.log(`     🍽️ Principio: ${item.personalizacion.principio.nombre}`);
          if (item.personalizacion.proteina) console.log(`     🥩 Proteína: ${item.personalizacion.proteina.nombre}`);
          if (item.personalizacion.bebida) console.log(`     ☕ Bebida: ${item.personalizacion.bebida.nombre}`);
        }
        
        if (item.observaciones) {
          console.log(`   📝 Obs: ${item.observaciones}`);
        }
        console.log('');
      });
      
      console.log('-'.repeat(50));
      console.log(`💰 Total adicional: $${nuevosItems.reduce((sum: number, item: any) => sum + item.subtotal, 0).toLocaleString('es-CO')}`);
      console.log('='.repeat(50));
      console.log('✅ Items adicionales enviados a cocina');
      console.log('='.repeat(50) + '\n');
      
      res.json({ message: 'Items nuevos procesados (impresión en consola)' });
    }
    
  } catch (error) {
    console.error('Error al imprimir nuevos items:', error);
    res.status(500).json({ error: 'Error al imprimir nuevos items' });
  }
});

export default router;
