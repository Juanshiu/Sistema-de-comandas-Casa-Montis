import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Comanda, ComandaItem, CreateComandaRequest, Mesa } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { imprimirComanda } from '../services/printer';
import { convertirAHoraColombia, getFechaSQLite_Colombia } from '../utils/dateUtils';

const router = Router();

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
        // Si es domicilio, no buscar mesas
        if (row.tipo_pedido === 'domicilio') {
          const comanda: Comanda = {
            id: row.id,
            mesas: [],
            mesero: row.mesero,
            subtotal: row.subtotal,
            total: row.total,
            estado: row.estado,
            observaciones_generales: row.observaciones_generales,
            fecha_creacion: convertirAHoraColombia(row.fecha_creacion),
            fecha_actualizacion: convertirAHoraColombia(row.fecha_actualizacion),
            tipo_pedido: 'domicilio',
            datos_cliente: {
              nombre: row.cliente_nombre,
              direccion: row.cliente_direccion || '',
              telefono: row.cliente_telefono || '',
              es_para_llevar: row.es_para_llevar === 1
            }
          };
          resolve(comanda);
          return;
        }
        
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
            fecha_creacion: convertirAHoraColombia(row.fecha_creacion),
            fecha_actualizacion: convertirAHoraColombia(row.fecha_actualizacion),
            tipo_pedido: row.tipo_pedido || 'mesa'
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
    
    // Obtener las mesas para cada comanda (solo si es tipo mesa)
    const comandasPromises = rows.map((row: any) => {
      return new Promise((resolve, reject) => {
        // Si es domicilio, no buscar mesas pero sí items
        if (row.tipo_pedido === 'domicilio') {
          // Obtener items de la comanda
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
              mesas: [],
              mesero: row.mesero,
              subtotal: row.subtotal,
              total: row.total,
              estado: row.estado,
              observaciones_generales: row.observaciones_generales,
              fecha_creacion: convertirAHoraColombia(row.fecha_creacion),
              fecha_actualizacion: convertirAHoraColombia(row.fecha_actualizacion),
              tipo_pedido: 'domicilio',
              datos_cliente: {
                nombre: row.cliente_nombre,
                direccion: row.cliente_direccion || '',
                telefono: row.cliente_telefono || '',
                es_para_llevar: row.es_para_llevar === 1
              },
              items: items
            };
            resolve(comanda);
          });
          return;
        }
        
        // Si es mesa, buscar las mesas asociadas
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
          
          // Obtener items de la comanda
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
              fecha_creacion: convertirAHoraColombia(row.fecha_creacion),
              fecha_actualizacion: convertirAHoraColombia(row.fecha_actualizacion),
              tipo_pedido: row.tipo_pedido || 'mesa',
              items: items
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

// Obtener historial de comandas (todas las comandas con items y mesas)
router.get('/historial', (req: Request, res: Response) => {
  const query = `
    SELECT 
      c.*
    FROM comandas c
    ORDER BY c.fecha_creacion DESC
  `;
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener historial:', err);
      return res.status(500).json({ error: 'Error al obtener el historial' });
    }
    
    if (rows.length === 0) {
      return res.json([]);
    }
    
    // Obtener mesas e items para cada comanda
    const comandasPromises = rows.map((row: any) => {
      return new Promise((resolve, reject) => {
        // Obtener items primero
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
            producto: {
              id: itemRow.producto_id,
              nombre: itemRow.producto_nombre,
              precio: itemRow.producto_precio,
              categoria: itemRow.producto_categoria,
              disponible: true
            }
          }));
          
          // Si es domicilio, no buscar mesas
          if (row.tipo_pedido === 'domicilio') {
            const comanda: Comanda = {
              id: row.id,
              mesas: [],
              mesero: row.mesero,
              subtotal: row.subtotal,
              total: row.total,
              estado: row.estado,
              observaciones_generales: row.observaciones_generales,
              fecha_creacion: convertirAHoraColombia(row.fecha_creacion),
              fecha_actualizacion: convertirAHoraColombia(row.fecha_actualizacion),
              tipo_pedido: 'domicilio',
              datos_cliente: {
                nombre: row.cliente_nombre,
                direccion: row.cliente_direccion || '',
                telefono: row.cliente_telefono || '',
                es_para_llevar: row.es_para_llevar === 1
              },
              items: items
            };
            resolve(comanda);
            return;
          }
          
          // Si es mesa, buscar las mesas asociadas
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
              fecha_creacion: convertirAHoraColombia(row.fecha_creacion),
              fecha_actualizacion: convertirAHoraColombia(row.fecha_actualizacion),
              tipo_pedido: row.tipo_pedido || 'mesa',
              items: items
            };
            
            resolve(comanda);
          });
        });
      });
    });
    
    Promise.all(comandasPromises)
      .then(comandas => res.json(comandas))
      .catch(err => {
        console.error('Error al obtener historial completo:', err);
        res.status(500).json({ error: 'Error al obtener el historial' });
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
          created_at: convertirAHoraColombia(row.created_at),
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
          fecha_creacion: convertirAHoraColombia(comandaRow.fecha_creacion),
          fecha_actualizacion: convertirAHoraColombia(comandaRow.fecha_actualizacion),
          tipo_pedido: comandaRow.tipo_pedido || 'mesa',
          datos_cliente: comandaRow.tipo_pedido === 'domicilio' ? {
            nombre: comandaRow.cliente_nombre,
            direccion: comandaRow.cliente_direccion || '',
            telefono: comandaRow.cliente_telefono || '',
            es_para_llevar: comandaRow.es_para_llevar === 1
          } : undefined,
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
  
  // Validar datos requeridos según el tipo de pedido
  const tipoPedido = comandaData.tipo_pedido || 'mesa';
  
  if (tipoPedido === 'domicilio') {
    // Validaciones para domicilio
    if (!comandaData.datos_cliente || !comandaData.datos_cliente.nombre) {
      return res.status(400).json({ error: 'Debe proporcionar el nombre del cliente para pedidos a domicilio' });
    }
    if (!comandaData.datos_cliente.es_para_llevar && !comandaData.datos_cliente.direccion) {
      return res.status(400).json({ error: 'Debe proporcionar la dirección para pedidos a domicilio' });
    }
  } else {
    // Validaciones para mesa
    if (!comandaData.mesas || comandaData.mesas.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos una mesa' });
    }
  }
  
  if (!comandaData.items || comandaData.items.length === 0) {
    return res.status(400).json({ error: 'Debe agregar al menos un producto' });
  }

  if (!comandaData.mesero || comandaData.mesero.trim() === '') {
    return res.status(400).json({ error: 'El nombre del mesero es requerido' });
  }
  
  const comandaId = uuidv4();
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Insertar comanda con los nuevos campos de domicilio
    const insertComandaQuery = `
      INSERT INTO comandas (
        id, 
        mesero, 
        subtotal, 
        total, 
        observaciones_generales,
        tipo_pedido,
        cliente_nombre,
        cliente_direccion,
        cliente_telefono,
        es_para_llevar
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(insertComandaQuery, [
      comandaId,
      comandaData.mesero,
      comandaData.subtotal,
      comandaData.total,
      comandaData.observaciones_generales || null,
      tipoPedido,
      comandaData.datos_cliente?.nombre || null,
      comandaData.datos_cliente?.direccion || null,
      comandaData.datos_cliente?.telefono || null,
      comandaData.datos_cliente?.es_para_llevar ? 1 : 0
    ], function(err: any) {
      if (err) {
        console.error('Error al insertar comanda:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error al crear la comanda' });
      }
      
      // Función auxiliar para insertar items
      function insertarItems() {
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
                
                // Obtener la comanda creada con sus items
                const getComandaQuery = 'SELECT * FROM comandas WHERE id = ?';
                db.get(getComandaQuery, [comandaId], (err: any, comandaRow: any) => {
                  if (err) {
                    console.error('Error al obtener comanda creada:', err);
                    return res.status(500).json({ error: 'Comanda creada pero error al obtener datos' });
                  }
                  
                  // Obtener los items de la comanda
                  const getItemsQuery = `
                    SELECT 
                      ci.*,
                      p.nombre as producto_nombre,
                      p.precio as producto_precio,
                      p.categoria as producto_categoria
                    FROM comanda_items ci
                    JOIN productos p ON ci.producto_id = p.id
                    WHERE ci.comanda_id = ?
                  `;
                  
                  db.all(getItemsQuery, [comandaId], (err: any, itemsRows: any[]) => {
                    if (err) {
                      console.error('Error al obtener items:', err);
                      return res.status(500).json({ error: 'Comanda creada pero error al obtener items' });
                    }
                    
                    const items = itemsRows.map(row => ({
                      id: row.id,
                      comanda_id: row.comanda_id,
                      producto_id: row.producto_id,
                      cantidad: row.cantidad,
                      precio_unitario: row.precio_unitario,
                      subtotal: row.subtotal,
                      observaciones: row.observaciones,
                      personalizacion: row.personalizacion ? JSON.parse(row.personalizacion) : null,
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
                      mesas: comandaData.mesas || [],
                      mesero: comandaRow.mesero,
                      subtotal: comandaRow.subtotal,
                      total: comandaRow.total,
                      estado: comandaRow.estado,
                      observaciones_generales: comandaRow.observaciones_generales,
                      fecha_creacion: convertirAHoraColombia(comandaRow.fecha_creacion),
                      fecha_actualizacion: convertirAHoraColombia(comandaRow.fecha_actualizacion),
                      tipo_pedido: comandaRow.tipo_pedido || 'mesa',
                      datos_cliente: comandaRow.tipo_pedido === 'domicilio' ? {
                        nombre: comandaRow.cliente_nombre,
                        direccion: comandaRow.cliente_direccion || '',
                        telefono: comandaRow.cliente_telefono || '',
                        es_para_llevar: comandaRow.es_para_llevar === 1
                      } : undefined,
                      items: items
                    };
                    
                    // Imprimir comanda (async)
                    console.log('🖨️  Intentando imprimir comanda:', comandaId);
                    imprimirComanda(comanda)
                      .then(() => {
                        console.log('✅ Comanda enviada a impresora exitosamente');
                      })
                      .catch((error) => {
                        console.error('❌ Error al imprimir comanda:', error);
                      });
                    
                    res.status(201).json({
                      message: 'Comanda creada exitosamente',
                      comanda
                    });
                  });
                });
              });
            }
          });
        });
      }
      
      // Insertar relaciones de mesas (solo si es tipo mesa)
      if (tipoPedido === 'mesa' && comandaData.mesas && comandaData.mesas.length > 0) {
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
            if (mesasInserted + mesasErrors === (comandaData.mesas?.length || 0)) {
              if (mesasErrors > 0) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al relacionar mesas con la comanda' });
              }
              
              // Marcar mesas como ocupadas
              const updateMesaQuery = 'UPDATE mesas SET ocupada = 1 WHERE id = ?';
              let mesasUpdated = 0;
              let updateErrors = 0;
              
              comandaData.mesas?.forEach((mesa) => {
                db.run(updateMesaQuery, [mesa.id], (err: any) => {
                  if (err) {
                    console.error('Error al ocupar mesa:', err);
                    updateErrors++;
                  } else {
                    mesasUpdated++;
                  }
                  
                  // Verificar si todas las mesas han sido actualizadas
                  if (mesasUpdated + updateErrors === (comandaData.mesas?.length || 0)) {
                    if (updateErrors > 0) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Error al ocupar las mesas' });
                    }
                    
                    // Continuar con inserción de items
                    insertarItems();
                  }
                });
              });
            }
          });
        });
      } else {
        // Si es domicilio, ir directo a insertar items
        insertarItems();
      }
    });
  });
});

// Editar comanda (agregar items adicionales)
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { items, observaciones_generales, imprimir, imprimirCompleta } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar items para agregar' });
  }

  console.log('🔍 ===== EDITANDO COMANDA =====');
  console.log('🔍 Comanda ID:', id);
  console.log('🔍 Items recibidos:', items.length);
  console.log('🔍 Imprimir completa:', imprimirCompleta);

  // Obtener items existentes de la comanda para detectar incrementos
  const queryItemsExistentes = 'SELECT * FROM comanda_items WHERE comanda_id = ?';
  
  db.all(queryItemsExistentes, [id], (err: any, itemsExistentesDB: any[]) => {
    if (err) {
      console.error('❌ Error al obtener items existentes:', err);
      return res.status(500).json({ error: 'Error al obtener items existentes' });
    }

    console.log('📋 Items existentes en BD:', itemsExistentesDB.length);

    // FILTRAR ITEMS NUEVOS Y DETECTAR INCREMENTOS EN CANTIDAD
    const itemsNuevos: any[] = [];
    const itemsIncrementados: any[] = [];

    items.forEach(item => {
      // Si no tiene id, es nuevo
      if (!item.id) {
        itemsNuevos.push(item);
        console.log(`   ✅ Item NUEVO (sin id): ${item.producto.nombre} x${item.cantidad}`);
        return;
      }
      
      // Si el id es temporal, es nuevo
      if (typeof item.id === 'string' && (item.id.startsWith('temp_') || item.id.startsWith('item_'))) {
        itemsNuevos.push(item);
        console.log(`   ✅ Item NUEVO (temporal): ${item.producto.nombre} x${item.cantidad}`);
        return;
      }
      
      if (typeof item.id === 'number') {
        itemsNuevos.push(item);
        console.log(`   ✅ Item NUEVO (número): ${item.producto.nombre} x${item.cantidad}`);
        return;
      }
      
      // Si el id no es un UUID válido, es nuevo
      const isUUID = typeof item.id === 'string' && item.id.includes('-');
      if (!isUUID) {
        itemsNuevos.push(item);
        console.log(`   ✅ Item NUEVO (no UUID): ${item.producto.nombre} x${item.cantidad}`);
        return;
      }
      
      // Verificar si la cantidad aumentó
      const itemExistente = itemsExistentesDB.find(ie => ie.id === item.id);
      if (itemExistente && item.cantidad > itemExistente.cantidad) {
        const cantidadAdicional = item.cantidad - itemExistente.cantidad;
        // Crear un item nuevo con la cantidad adicional
        const itemAdicional = {
          ...item,
          id: `temp_inc_${Date.now()}_${Math.random()}`,
          cantidad: cantidadAdicional,
          subtotal: cantidadAdicional * item.precio_unitario
        };
        itemsIncrementados.push(itemAdicional);
        console.log(`   📈 Item INCREMENTADO: ${item.producto.nombre}, cantidad adicional: ${cantidadAdicional}`);
        
        // También actualizar el item existente con la nueva cantidad
        const updateItemQuery = `
          UPDATE comanda_items 
          SET cantidad = ?, subtotal = ?, fecha_actualizacion = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;
        db.run(updateItemQuery, [item.cantidad, item.subtotal, item.id], (err: any) => {
          if (err) console.error('Error al actualizar cantidad del item:', err);
        });
      }
    });

    // Combinar items nuevos con los incrementados
    const todosLosItemsNuevos = [...itemsNuevos, ...itemsIncrementados];

    console.log('✅ Items NUEVOS filtrados:', todosLosItemsNuevos.length);
    console.log('✅ Items NUEVOS:', todosLosItemsNuevos.map(i => `${i.producto.nombre} x${i.cantidad}`).join(', '));

    if (todosLosItemsNuevos.length === 0 && !imprimirCompleta) {
      return res.status(400).json({ error: 'No hay items nuevos para agregar' });
    }

    procesarEdicionComanda(id, items, todosLosItemsNuevos, observaciones_generales, imprimir, imprimirCompleta, res);
  });
});

function procesarEdicionComanda(
  id: string,
  todosLosItems: any[],
  itemsNuevos: any[],
  observaciones_generales: string | undefined,
  imprimir: boolean | undefined,
  imprimirCompleta: boolean | undefined,
  res: Response
) {

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Actualizar observaciones generales si se proporcionan
    if (observaciones_generales !== undefined) {
      const updateObservacionesQuery = `
        UPDATE comandas 
        SET observaciones_generales = ?,
            fecha_actualizacion = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      db.run(updateObservacionesQuery, [observaciones_generales, id], (err: any) => {
        if (err) {
          console.error('Error al actualizar observaciones:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error al actualizar observaciones' });
        }
      });
    }

    // Insertar nuevos items
    const insertItemQuery = `
      INSERT INTO comanda_items (id, comanda_id, producto_id, cantidad, precio_unitario, subtotal, observaciones, personalizacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let itemsInserted = 0;
    let itemsErrors = 0;
    let nuevoTotal = 0;

    // USAR SOLO LOS ITEMS NUEVOS FILTRADOS
    itemsNuevos.forEach((item) => {
      const itemId = uuidv4();
      const personalizacionStr = item.personalizacion ? JSON.stringify(item.personalizacion) : null;
      nuevoTotal += item.subtotal;

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
          console.error('Error al insertar item adicional:', err);
          itemsErrors++;
        } else {
          itemsInserted++;
        }

        // Verificar si todos los items NUEVOS han sido procesados
        if (itemsInserted + itemsErrors === itemsNuevos.length) {
          if (itemsErrors > 0) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error al agregar items adicionales' });
          }

          // Actualizar totales
          const updateTotalesQuery = `
            UPDATE comandas 
            SET subtotal = subtotal + ?,
                total = total + ?,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
          `;

          db.run(updateTotalesQuery, [nuevoTotal, nuevoTotal, id], (err: any) => {
            if (err) {
              console.error('Error al actualizar totales:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error al actualizar totales' });
            }

            db.run('COMMIT', (err: any) => {
              if (err) {
                console.error('Error al hacer commit:', err);
                return res.status(500).json({ error: 'Error al guardar cambios' });
              }

              // Obtener la comanda actualizada
              const getComandaQuery = 'SELECT * FROM comandas WHERE id = ?';
              db.get(getComandaQuery, [id], (err: any, comandaRow: any) => {
                if (err) {
                  console.error('Error al obtener comanda actualizada:', err);
                  return res.status(500).json({ error: 'Comanda actualizada pero error al obtener datos' });
                }

                // Si se debe imprimir, decidir qué imprimir
                if (imprimir || imprimirCompleta) {
                  if (imprimirCompleta) {
                    // Imprimir la comanda completa
                    console.log(`🖨️  Preparando impresión de comanda completa...`);
                    
                    // Obtener TODOS los items de la comanda
                    const queryTodosItems = `
                      SELECT 
                        ci.*,
                        p.nombre as producto_nombre,
                        p.precio as producto_precio,
                        p.categoria as producto_categoria
                      FROM comanda_items ci
                      JOIN productos p ON ci.producto_id = p.id
                      WHERE ci.comanda_id = ?
                    `;
                    
                    db.all(queryTodosItems, [id], (err: any, todosItemsRows: any[]) => {
                      if (err) {
                        console.error('Error al obtener todos los items:', err);
                        return;
                      }
                      
                      const itemsParaImprimir = todosItemsRows.map(item => ({
                        id: item.id,
                        comanda_id: id,
                        producto_id: item.producto_id,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario,
                        subtotal: item.subtotal,
                        observaciones: item.observaciones,
                        personalizacion: item.personalizacion ? JSON.parse(item.personalizacion) : undefined,
                        producto: {
                          id: item.producto_id,
                          nombre: item.producto_nombre,
                          precio: item.producto_precio,
                          categoria: item.producto_categoria,
                          disponible: true
                        }
                      }));
                      
                      imprimirComandaCompleta(id, comandaRow, itemsParaImprimir);
                    });
                  } else if (imprimir) {
                    // Imprimir solo items adicionales
                    console.log(`🖨️  Preparando impresión de ${itemsNuevos.length} items adicionales...`);
                    
                    // Formatear los items NUEVOS recién agregados con la información del producto
                    const itemsParaImprimir = itemsNuevos.map(item => ({
                      id: uuidv4(),
                      comanda_id: id,
                      producto_id: item.producto.id,
                      cantidad: item.cantidad,
                      precio_unitario: item.precio_unitario,
                      subtotal: item.subtotal,
                      observaciones: item.observaciones,
                      personalizacion: item.personalizacion,
                      producto: {
                        id: item.producto.id,
                        nombre: item.producto.nombre,
                        precio: item.producto.precio,
                        categoria: item.producto.categoria,
                        disponible: true
                      }
                    }));
                    
                    imprimirItemsAdicionales(id, comandaRow, itemsParaImprimir);
                  }
                }

                res.json({
                  message: 'Comanda actualizada exitosamente',
                  comanda: {
                    id: comandaRow.id,
                    subtotal: comandaRow.subtotal,
                    total: comandaRow.total,
                    itemsAgregados: itemsNuevos.length
                  }
                });
              });
            });
          });
        }
      });
    });
  });
}

// Función auxiliar para imprimir items adicionales
function imprimirItemsAdicionales(comandaId: string, comandaRow: any, itemsParaImprimir: any[]) {
  if (comandaRow.tipo_pedido === 'mesa') {
    const mesasQuery = `
      SELECT m.* 
      FROM mesas m
      INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
      WHERE cm.comanda_id = ?
    `;

    db.all(mesasQuery, [comandaId], (err: any, mesasRows: any[]) => {
      const comanda: Comanda = {
        id: comandaRow.id,
        mesas: mesasRows ? mesasRows.map(m => ({
          id: m.id,
          numero: m.numero,
          capacidad: m.capacidad,
          salon: m.salon,
          ocupada: m.ocupada
        })) : [],
        mesero: comandaRow.mesero,
        subtotal: comandaRow.subtotal,
        total: comandaRow.total,
        estado: comandaRow.estado,
        observaciones_generales: 'ITEMS ADICIONALES\n' + (comandaRow.observaciones_generales || ''),
        fecha_creacion: convertirAHoraColombia(comandaRow.fecha_creacion),
        fecha_actualizacion: convertirAHoraColombia(comandaRow.fecha_actualizacion),
        tipo_pedido: comandaRow.tipo_pedido || 'mesa',
        items: itemsParaImprimir
      };

      console.log('🖨️  Imprimiendo items adicionales...');
      imprimirComanda(comanda)
        .then(() => console.log('✅ Items adicionales impresos'))
        .catch((error) => console.error('❌ Error al imprimir items adicionales:', error));
    });
  } else {
    const comanda: Comanda = {
      id: comandaRow.id,
      mesas: [],
      mesero: comandaRow.mesero,
      subtotal: comandaRow.subtotal,
      total: comandaRow.total,
      estado: comandaRow.estado,
      observaciones_generales: 'ITEMS ADICIONALES\n' + (comandaRow.observaciones_generales || ''),
      fecha_creacion: convertirAHoraColombia(comandaRow.fecha_creacion),
      fecha_actualizacion: convertirAHoraColombia(comandaRow.fecha_actualizacion),
      tipo_pedido: 'domicilio',
      datos_cliente: {
        nombre: comandaRow.cliente_nombre,
        direccion: comandaRow.cliente_direccion || '',
        telefono: comandaRow.cliente_telefono || '',
        es_para_llevar: comandaRow.es_para_llevar === 1
      },
      items: itemsParaImprimir
    };

    console.log('🖨️  Imprimiendo items adicionales...');
    imprimirComanda(comanda)
      .then(() => console.log('✅ Items adicionales impresos'))
      .catch((error) => console.error('❌ Error al imprimir items adicionales:', error));
  }
}

// Función auxiliar para imprimir comanda completa
function imprimirComandaCompleta(comandaId: string, comandaRow: any, itemsParaImprimir: any[]) {
  if (comandaRow.tipo_pedido === 'mesa') {
    const mesasQuery = `
      SELECT m.* 
      FROM mesas m
      INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
      WHERE cm.comanda_id = ?
    `;

    db.all(mesasQuery, [comandaId], (err: any, mesasRows: any[]) => {
      const comanda: Comanda = {
        id: comandaRow.id,
        mesas: mesasRows ? mesasRows.map(m => ({
          id: m.id,
          numero: m.numero,
          capacidad: m.capacidad,
          salon: m.salon,
          ocupada: m.ocupada
        })) : [],
        mesero: comandaRow.mesero,
        subtotal: comandaRow.subtotal,
        total: comandaRow.total,
        estado: comandaRow.estado,
        observaciones_generales: comandaRow.observaciones_generales || '',
        fecha_creacion: convertirAHoraColombia(comandaRow.fecha_creacion),
        fecha_actualizacion: convertirAHoraColombia(comandaRow.fecha_actualizacion),
        tipo_pedido: comandaRow.tipo_pedido || 'mesa',
        items: itemsParaImprimir
      };

      console.log('🖨️  Imprimiendo comanda completa...');
      imprimirComanda(comanda)
        .then(() => console.log('✅ Comanda completa impresa'))
        .catch((error) => console.error('❌ Error al imprimir comanda completa:', error));
    });
  } else {
    const comanda: Comanda = {
      id: comandaRow.id,
      mesas: [],
      mesero: comandaRow.mesero,
      subtotal: comandaRow.subtotal,
      total: comandaRow.total,
      estado: comandaRow.estado,
      observaciones_generales: comandaRow.observaciones_generales || '',
      fecha_creacion: convertirAHoraColombia(comandaRow.fecha_creacion),
      fecha_actualizacion: convertirAHoraColombia(comandaRow.fecha_actualizacion),
      tipo_pedido: 'domicilio',
      datos_cliente: {
        nombre: comandaRow.cliente_nombre,
        direccion: comandaRow.cliente_direccion || '',
        telefono: comandaRow.cliente_telefono || '',
        es_para_llevar: comandaRow.es_para_llevar === 1
      },
      items: itemsParaImprimir
    };

    console.log('🖨️  Imprimiendo comanda completa...');
    imprimirComanda(comanda)
      .then(() => console.log('✅ Comanda completa impresa'))
      .catch((error) => console.error('❌ Error al imprimir comanda completa:', error));
  }
}

// Actualizar estado de comanda
router.patch('/:id/estado', (req: Request, res: Response) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  const estadosValidos = ['pendiente', 'preparando', 'lista', 'entregada', 'cancelada'];
  
  if (!estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  
  const query = 'UPDATE comandas SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(query, [estado, id], function(err: any) {
    if (err) {
      console.error('Error al actualizar estado de comanda:', err);
      return res.status(500).json({ error: 'Error al actualizar el estado de la comanda' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Comanda no encontrada' });
    }
    
    res.json({ message: 'Estado de comanda actualizado exitosamente' });
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

export default router;

