import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Comanda, ComandaItem, CreateComandaRequest, Mesa } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { imprimirComanda } from '../services/printer';
import { convertirAHoraColombia, getFechaSQLite_Colombia } from '../utils/dateUtils';
import { verificarAutenticacion } from '../middleware/authMiddleware';

const router = Router();

// ===== FUNCIÓN AUXILIAR: DECREMENTAR INVENTARIO DE PERSONALIZACIONES =====
/**
 * Decrementa el inventario de las personalizaciones usadas en items
 * @param items - Array de items con personalizaciones
 * @returns Promise que resuelve cuando se completa el proceso
 */
async function decrementarInventarioPersonalizaciones(items: any[]): Promise<void> {
  const promises: Promise<void>[] = [];
  
  for (const item of items) {
    // Si no tiene personalización, continuar
    if (!item.personalizacion || typeof item.personalizacion !== 'object') {
      continue;
    }
    
    const personalizacion = item.personalizacion;
    
    // Iterar sobre cada categoría en la personalización
    for (const [categoriaId, itemId] of Object.entries(personalizacion)) {
      // Saltar la clave precio_adicional
      if (categoriaId === 'precio_adicional' || itemId === null || itemId === undefined) {
        continue;
      }
      
      const itemIdNum = Number(itemId);
      if (isNaN(itemIdNum)) continue;
      
      // Crear promesa para decrementar este item
      promises.push(
        new Promise<void>((resolve, reject) => {
          // Obtener info del item de personalización
          db.get(
            'SELECT * FROM items_personalizacion WHERE id = ?',
            [itemIdNum],
            (err: any, itemPers: any) => {
              if (err) {
                console.error(`❌ Error al obtener item personalización ${itemIdNum}:`, err);
                resolve(); // No fallar la transacción completa
                return;
              }
              
              if (!itemPers) {
                console.warn(`⚠️  Item personalización ${itemIdNum} no encontrado`);
                resolve();
                return;
              }
              
              // Si no usa inventario, continuar
              if (!itemPers.usa_inventario) {
                resolve();
                return;
              }
              
              // Verificar inventario disponible
              if (itemPers.cantidad_actual === null || itemPers.cantidad_actual < item.cantidad) {
                console.error(`❌ Inventario insuficiente para ${itemPers.nombre}: disponible=${itemPers.cantidad_actual}, necesario=${item.cantidad}`);
                reject(new Error(`Inventario insuficiente para personalización: ${itemPers.nombre}`));
                return;
              }
              
              // Decrementar inventario
              const nuevaCantidad = itemPers.cantidad_actual - item.cantidad;
              
              db.run(
                'UPDATE items_personalizacion SET cantidad_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [nuevaCantidad, itemIdNum],
                (err: any) => {
                  if (err) {
                    console.error(`❌ Error al decrementar inventario de ${itemPers.nombre}:`, err);
                    reject(err);
                    return;
                  }
                  
                  console.log(`✅ Inventario decrementado: ${itemPers.nombre} (${itemPers.cantidad_actual} → ${nuevaCantidad})`);
                  
                  // Si llegó a 0, marcar como no disponible
                  if (nuevaCantidad <= 0) {
                    db.run(
                      'UPDATE items_personalizacion SET disponible = 0 WHERE id = ?',
                      [itemIdNum],
                      (err: any) => {
                        if (err) {
                          console.error(`❌ Error al marcar como no disponible ${itemPers.nombre}:`, err);
                        } else {
                          console.log(`⚠️  ${itemPers.nombre} marcado como NO DISPONIBLE (inventario agotado)`);
                        }
                      }
                    );
                  }
                  
                  resolve();
                }
              );
            }
          );
        })
      );
    }
  }
  
  await Promise.all(promises);
}

// Función para decrementar inventario de productos
async function decrementarInventarioProductos(items: any[]): Promise<void> {
  const promises: Promise<void>[] = [];
  
  for (const item of items) {
    if (!item.producto || !item.producto.id) {
      continue;
    }
    
    const productoId = item.producto.id;
    const cantidadRequerida = item.cantidad;
    
    // Crear promesa para decrementar este producto
    promises.push(
      new Promise<void>((resolve, reject) => {
        // Obtener info del producto
        db.get(
          'SELECT * FROM productos WHERE id = ?',
          [productoId],
          (err: any, producto: any) => {
            if (err) {
              console.error(`❌ Error al obtener producto ${productoId}:`, err);
              resolve(); // No fallar la transacción completa
              return;
            }
            
            if (!producto) {
              console.warn(`⚠️  Producto ${productoId} no encontrado`);
              resolve();
              return;
            }
            
            // Si no usa inventario, continuar
            if (!producto.usa_inventario) {
              resolve();
              return;
            }
            
            // Verificar inventario disponible
            if (producto.cantidad_actual === null || producto.cantidad_actual < cantidadRequerida) {
              console.error(`❌ Inventario insuficiente para ${producto.nombre}: disponible=${producto.cantidad_actual}, necesario=${cantidadRequerida}`);
              reject(new Error(`Inventario insuficiente para producto: ${producto.nombre}`));
              return;
            }
            
            // Decrementar inventario
            const nuevaCantidad = producto.cantidad_actual - cantidadRequerida;
            
            db.run(
              'UPDATE productos SET cantidad_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [nuevaCantidad, productoId],
              (err: any) => {
                if (err) {
                  console.error(`❌ Error al decrementar inventario de ${producto.nombre}:`, err);
                  reject(err);
                  return;
                }
                
                console.log(`✅ Inventario de producto decrementado: ${producto.nombre} (${producto.cantidad_actual} → ${nuevaCantidad})`);
                
                // Si llegó a 0, marcar como no disponible
                if (nuevaCantidad <= 0) {
                  db.run(
                    'UPDATE productos SET disponible = 0 WHERE id = ?',
                    [productoId],
                    (err: any) => {
                      if (err) {
                        console.error(`❌ Error al marcar como no disponible ${producto.nombre}:`, err);
                      } else {
                        console.log(`⚠️  ${producto.nombre} marcado como NO DISPONIBLE (inventario agotado)`);
                      }
                    }
                  );
                }
                
                resolve();
              }
            );
          }
        );
      })
    );
  }
  
  await Promise.all(promises);
}

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
            ORDER BY ci.rowid
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
            ORDER BY ci.rowid
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

// Obtener historial de comandas (paginado)
router.get('/historial', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;
  const fecha = req.query.fecha as string;

  // 1. Obtener el total de registros para la paginación
  let countQuery = 'SELECT COUNT(*) as count FROM comandas c';
  const countParams: any[] = [];

  if (fecha) {
    countQuery += ' WHERE date(c.fecha_creacion) = ?';
    countParams.push(fecha);
  }

  db.get(countQuery, countParams, (err: any, countRow: any) => {
    if (err) {
      console.error('Error al contar historial:', err);
      return res.status(500).json({ error: 'Error al obtener el historial' });
    }

    const total = countRow.count;
    const totalPages = Math.ceil(total / limit);

    // 2. Obtener los registros paginados
    let query = `
      SELECT 
        c.*,
        f.metodo_pago,
        f.monto_pagado,
        f.cambio
      FROM comandas c
      LEFT JOIN facturas f ON c.id = f.comanda_id
    `;
    const queryParams: any[] = [];

    if (fecha) {
      query += ' WHERE date(c.fecha_creacion) = ?';
      queryParams.push(fecha);
    }

    query += ' ORDER BY c.fecha_creacion DESC LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);
    
    db.all(query, queryParams, (err: any, rows: any[]) => {
      if (err) {
        console.error('Error al obtener historial:', err);
        return res.status(500).json({ error: 'Error al obtener el historial' });
      }
      
      if (rows.length === 0) {
        return res.json({
          data: [],
          pagination: {
            total,
            page,
            limit,
            totalPages
          }
        });
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
            ORDER BY ci.rowid
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
                items: items,
                metodo_pago: row.metodo_pago || undefined,
                monto_pagado: row.monto_pagado || undefined,
                cambio: row.cambio || undefined
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
                items: items,
                metodo_pago: row.metodo_pago || undefined,
                monto_pagado: row.monto_pagado || undefined,
                cambio: row.cambio || undefined
              };
              
              resolve(comanda);
            });
          });
        });
      });
      
      Promise.all(comandasPromises)
        .then(comandas => res.json({
          data: comandas,
          pagination: {
            total,
            page,
            limit,
            totalPages
          }
        }))
        .catch(err => {
          console.error('Error al obtener historial completo:', err);
          res.status(500).json({ error: 'Error al obtener el historial' });
        });
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
        ORDER BY ci.rowid
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
router.post('/', verificarAutenticacion, (req: Request, res: Response) => {
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

  // El mesero ahora es el usuario autenticado
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const usuarioNombre = req.usuario.nombre_completo;
  const usuarioId = req.usuario.id;

  /* 
  ELIMINADO: Validación manual de mesero
  if (!comandaData.mesero || comandaData.mesero.trim() === '') {
    return res.status(400).json({ error: 'El nombre del mesero es requerido' });
  }
  */
  
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
        es_para_llevar,
        usuario_id,
        usuario_nombre
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(insertComandaQuery, [
      comandaId,
      usuarioNombre, // Usar nombre del usuario autenticado como "mesero" (legacy)
      comandaData.subtotal,
      comandaData.total,
      comandaData.observaciones_generales || null,
      tipoPedido,
      comandaData.datos_cliente?.nombre || null,
      comandaData.datos_cliente?.direccion || null,
      comandaData.datos_cliente?.telefono || null,
      comandaData.datos_cliente?.es_para_llevar ? 1 : 0,
      usuarioId,
      usuarioNombre
    ], function(err: any) {
      if (err) {
        console.error('Error al insertar comanda:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error al crear la comanda' });
      }
      
      // Función auxiliar para insertar items
      function insertarItems() {
        // Primero validar y decrementar inventario de productos y personalizaciones
        Promise.all([
          decrementarInventarioProductos(comandaData.items),
          decrementarInventarioPersonalizaciones(comandaData.items)
        ])
          .then(() => {
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
                    ORDER BY ci.rowid
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
          })
          .catch((error: any) => {
            console.error('❌ Error al decrementar inventario:', error);
            db.run('ROLLBACK');
            return res.status(400).json({ 
              error: error.message || 'Error al validar inventario de personalizaciones' 
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

// Editar comanda (agregar items adicionales, actualizar o eliminar)
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { items, observaciones_generales, imprimir, imprimirCompleta } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    // Si no hay items, podría ser que se eliminaron todos. 
    // Pero el frontend suele enviar array vacío si borra todo? 
    // Asumiremos que si llega vacío es válido si la intención es borrar todo, 
    // pero la validación original prevenía esto. Mantendremos la validación por seguridad básica,
    // aunque idealmente debería permitirse vaciar una comanda (cancelarla es otro proceso).
    // Si el usuario borra todos los items, debería cancelar la comanda, no editarla a 0 items.
    return res.status(400).json({ error: 'Debe proporcionar items para agregar o actualizar' });
  }

  console.log('🔍 ===== EDITANDO COMANDA =====');
  console.log('🔍 Comanda ID:', id);
  console.log('🔍 Items recibidos:', items.length);
  console.log('🔍 Imprimir completa:', imprimirCompleta);

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Obtener items existentes para comparar
    const queryItemsExistentes = 'SELECT * FROM comanda_items WHERE comanda_id = ?';
    
    db.all(queryItemsExistentes, [id], (err: any, itemsExistentesDB: any[]) => {
      if (err) {
        console.error('❌ Error al obtener items existentes:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error al obtener items existentes' });
      }

      const itemsNuevos: any[] = [];
      const itemsParaActualizar: any[] = [];
      const itemsConIncrementosCantidad: any[] = []; // NUEVO: Trackear incrementos de cantidad
      const idsItemsRecibidos = new Set<string>();

      // 2. Clasificar items recibidos (Nuevos vs Existentes)
      items.forEach(item => {
        // Identificar si es nuevo
        const esNuevo = !item.id || 
                        (typeof item.id === 'string' && (item.id.startsWith('temp_') || item.id.startsWith('item_'))) ||
                        (typeof item.id === 'string' && !item.id.includes('-')); // No es UUID

        if (esNuevo) {
          itemsNuevos.push(item);
        } else {
          idsItemsRecibidos.add(item.id);
          
          // Verificar si hay cambios en items existentes
          const itemExistente = itemsExistentesDB.find(ie => ie.id === item.id);
          if (itemExistente) {
            let necesitaActualizacion = false;
            
            // Cambio en cantidad
            if (item.cantidad !== itemExistente.cantidad) {
              necesitaActualizacion = true;
              
              // 🆕 NUEVO: Si la cantidad aumentó, guardar el incremento
              if (item.cantidad > itemExistente.cantidad) {
                const incremento = item.cantidad - itemExistente.cantidad;
                itemsConIncrementosCantidad.push({
                  ...item,
                  cantidad_original: itemExistente.cantidad,
                  cantidad_incremento: incremento,
                  cantidad_total: item.cantidad
                });
              }
            }
            
            // Cambio en personalización
            const personalizacionExistente = itemExistente.personalizacion ? 
              (typeof itemExistente.personalizacion === 'string' ? JSON.parse(itemExistente.personalizacion) : itemExistente.personalizacion) : null;
            const personalizacionNueva = item.personalizacion;
            
            if (JSON.stringify(personalizacionExistente) !== JSON.stringify(personalizacionNueva)) {
              necesitaActualizacion = true;
            }

            if (necesitaActualizacion) {
              itemsParaActualizar.push(item);
            }
          }
        }
      });

      // 3. Identificar items eliminados
      const itemsEliminados = itemsExistentesDB.filter(ie => !idsItemsRecibidos.has(ie.id));

      console.log(`📊 Resumen cambios: Nuevos=${itemsNuevos.length}, Actualizar=${itemsParaActualizar.length}, Incrementos=${itemsConIncrementosCantidad.length}, Eliminar=${itemsEliminados.length}`);

      // 4. Procesar Eliminaciones
      const deletePromises = itemsEliminados.map(item => {
        return new Promise<void>((resolve, reject) => {
          db.run('DELETE FROM comanda_items WHERE id = ?', [item.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      // 5. Procesar Actualizaciones
      const updatePromises = itemsParaActualizar.map(item => {
        return new Promise<void>((resolve, reject) => {
          const personalizacionJSON = item.personalizacion ? JSON.stringify(item.personalizacion) : null;
          // CORRECCIÓN: Eliminado fecha_actualizacion que causaba el crash
          const query = `
            UPDATE comanda_items 
            SET cantidad = ?, subtotal = ?, personalizacion = ?
            WHERE id = ?
          `;
          db.run(query, [item.cantidad, item.subtotal, personalizacionJSON, item.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      // 6. Procesar Inserciones (Nuevos)
      const insertPromises = itemsNuevos.map(item => {
        return new Promise<void>((resolve, reject) => {
          const itemId = uuidv4();
          const personalizacionStr = item.personalizacion ? JSON.stringify(item.personalizacion) : null;
          const query = `
            INSERT INTO comanda_items (id, comanda_id, producto_id, cantidad, precio_unitario, subtotal, observaciones, personalizacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;
          db.run(query, [
            itemId, id, item.producto.id, item.cantidad, item.precio_unitario, item.subtotal, item.observaciones || null, personalizacionStr
          ], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      // 7. Decrementar inventario solo de items nuevos (productos y personalizaciones)
      Promise.all([
        decrementarInventarioProductos(itemsNuevos),
        decrementarInventarioPersonalizaciones(itemsNuevos)
      ])
        .then(() => {
          // Ejecutar todas las operaciones de items
          Promise.all([...deletePromises, ...updatePromises, ...insertPromises])
        .then(() => {
          // 7. Recalcular Totales de la Comanda
          const queryRecalcular = 'SELECT SUM(subtotal) as total FROM comanda_items WHERE comanda_id = ?';
          db.get(queryRecalcular, [id], (err: any, row: any) => {
            if (err) {
              console.error('Error al recalcular totales:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error al recalcular totales' });
            }

            const nuevoTotal = row ? (row.total || 0) : 0;
            
            // Actualizar comanda con nuevos totales y observaciones
            const updateComandaQuery = `
              UPDATE comandas 
              SET subtotal = ?, total = ?, observaciones_generales = ?, fecha_actualizacion = CURRENT_TIMESTAMP
              WHERE id = ?
            `;
            
            db.run(updateComandaQuery, [nuevoTotal, nuevoTotal, observaciones_generales, id], (err: any) => {
              if (err) {
                console.error('Error al actualizar comanda:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al actualizar comanda' });
              }

              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error en COMMIT:', err);
                  return res.status(500).json({ error: 'Error al confirmar cambios' });
                }
                
                // 8. Manejar Impresión (fuera de la transacción)
                handleImpresion(id, itemsNuevos, itemsConIncrementosCantidad, imprimir, imprimirCompleta, res);
              });
            });
          });
        })
        .catch(err => {
          console.error('Error procesando items:', err);
          db.run('ROLLBACK');
          res.status(500).json({ error: 'Error al procesar los cambios en los items' });
        });
        })
        .catch((error: any) => {
          console.error('❌ Error al decrementar inventario en edición:', error);
          db.run('ROLLBACK');
          return res.status(400).json({ 
            error: error.message || 'Error al validar inventario de personalizaciones' 
          });
        });
    });
  });
});

// Función auxiliar para manejar la impresión después de guardar
function handleImpresion(
  comandaId: string, 
  itemsNuevos: any[], 
  itemsConIncrementos: any[], 
  imprimir: boolean | undefined, 
  imprimirCompleta: boolean | undefined, 
  res: Response
) {
  // Obtener datos actualizados para imprimir
  const queryComanda = 'SELECT * FROM comandas WHERE id = ?';
  db.get(queryComanda, [comandaId], (err: any, comandaRow: any) => {
    if (err || !comandaRow) {
      return res.json({ message: 'Comanda actualizada (Error al obtener datos para impresión)' });
    }

    if (imprimirCompleta) {
       // Obtener TODOS los items
       const queryTodosItems = `
         SELECT ci.*, p.nombre as producto_nombre, p.precio as producto_precio, p.categoria as producto_categoria
         FROM comanda_items ci JOIN productos p ON ci.producto_id = p.id
         WHERE ci.comanda_id = ? ORDER BY ci.rowid
       `;
       db.all(queryTodosItems, [comandaId], (err: any, rows: any[]) => {
         if (!err) {
           const itemsFormateados = rows.map(formatItemForPrint);
           imprimirComandaCompleta(comandaId, comandaRow, itemsFormateados);
         }
       });
    } else if (imprimir) {
      // 🆕 MEJORA: Combinar items completamente nuevos + incrementos de cantidad
      const itemsParaImprimir: any[] = [];
      
      // Agregar items completamente nuevos
      itemsNuevos.forEach((item: any) => {
        itemsParaImprimir.push({
          ...item,
          id: uuidv4(), // ID ficticio para impresión
          comanda_id: comandaId
        });
      });
      
      // 🆕 NUEVO: Agregar incrementos de cantidad como items "adicionales"
      itemsConIncrementos.forEach((item: any) => {
        itemsParaImprimir.push({
          ...item,
          cantidad: item.cantidad_incremento, // Solo la cantidad que se agregó
          id: uuidv4(), // ID ficticio para impresión
          comanda_id: comandaId
        });
      });
      
      if (itemsParaImprimir.length > 0) {
        imprimirItemsAdicionales(comandaId, comandaRow, itemsParaImprimir);
      } else {
        // No hay nada que imprimir
        console.log('⚠️ No hay items adicionales para imprimir (solo cambios en personalizaciones)');
      }
    }

    res.json({ message: 'Comanda actualizada exitosamente', comanda: comandaRow });
  });
}

function formatItemForPrint(item: any) {
  return {
    id: item.id,
    comanda_id: item.comanda_id,
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
  };
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
  
  db.serialize(() => {
    // Actualizar estado de la comanda
    const query = 'UPDATE comandas SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(query, [estado, id], function(err: any) {
      if (err) {
        console.error('Error al actualizar estado de comanda:', err);
        return res.status(500).json({ error: 'Error al actualizar el estado de la comanda' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Comanda no encontrada' });
      }
      
      // Si el estado es 'cancelada', 'entregada' o 'facturada', liberar las mesas asociadas
      if (estado === 'cancelada' || estado === 'entregada' || estado === 'facturada') {
        const liberarMesasQuery = `
          UPDATE mesas 
          SET ocupada = 0, updated_at = CURRENT_TIMESTAMP 
          WHERE id IN (SELECT mesa_id FROM comanda_mesas WHERE comanda_id = ?)
        `;
        
        db.run(liberarMesasQuery, [id], (err: any) => {
          if (err) {
            console.error('Error al liberar mesas:', err);
            // No retornar error aquí para no afectar la actualización del estado
            // pero sí loguearlo
            console.warn(`Mesas no liberadas para comanda ${id} con estado ${estado}`);
          } else {
            console.log(`✅ Mesas liberadas automáticamente para comanda ${id} (estado: ${estado})`);
          }
          
          res.json({ 
            message: 'Estado de comanda actualizado exitosamente',
            mesas_liberadas: err ? false : true
          });
        });
      } else {
        res.json({ message: 'Estado de comanda actualizado exitosamente' });
      }
    });
  });
});

// Cambiar mesa(s) de una comanda activa
router.patch('/:id/cambiar-mesa', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nuevas_mesas } = req.body;

  if (!nuevas_mesas || !Array.isArray(nuevas_mesas) || nuevas_mesas.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar al menos una mesa nueva' });
  }

  console.log('🔄 ===== CAMBIO DE MESA =====');
  console.log('🔄 Comanda ID:', id);
  console.log('🔄 Nuevas mesas:', nuevas_mesas.map(m => m.id));

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. Verificar que la comanda existe y es de tipo mesa
    db.get('SELECT * FROM comandas WHERE id = ?', [id], (err: any, comanda: any) => {
      if (err) {
        console.error('Error al obtener comanda:', err);
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Error al obtener la comanda' });
      }

      if (!comanda) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Comanda no encontrada' });
      }

      if (comanda.tipo_pedido === 'domicilio') {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'No se puede cambiar mesa a pedidos de domicilio' });
      }

      // 2. Verificar que las nuevas mesas existen y están disponibles
      const mesasIds = nuevas_mesas.map(m => m.id);
      const placeholders = mesasIds.map(() => '?').join(',');
      const queryMesas = `SELECT * FROM mesas WHERE id IN (${placeholders})`;

      db.all(queryMesas, mesasIds, (err: any, mesasRows: any[]) => {
        if (err) {
          console.error('Error al verificar mesas:', err);
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Error al verificar las mesas' });
        }

        if (mesasRows.length !== nuevas_mesas.length) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Una o más mesas no existen' });
        }

        // Verificar que las mesas nuevas estén disponibles
        const mesasOcupadas = mesasRows.filter(m => m.ocupada === 1);
        if (mesasOcupadas.length > 0) {
          db.run('ROLLBACK');
          return res.status(400).json({ 
            error: 'Una o más mesas ya están ocupadas', 
            mesas_ocupadas: mesasOcupadas.map(m => m.numero)
          });
        }

        // 3. Obtener mesas actuales de la comanda
        db.all('SELECT mesa_id FROM comanda_mesas WHERE comanda_id = ?', [id], (err: any, mesasActuales: any[]) => {
          if (err) {
            console.error('Error al obtener mesas actuales:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error al obtener mesas actuales' });
          }

          const mesasAnterioresIds = mesasActuales.map(m => m.mesa_id);

          // 4. Eliminar relaciones antiguas
          db.run('DELETE FROM comanda_mesas WHERE comanda_id = ?', [id], (err: any) => {
            if (err) {
              console.error('Error al eliminar relaciones antiguas:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error al actualizar mesas' });
            }

            // 5. Insertar nuevas relaciones
            let relacionesInsertadas = 0;
            let erroresInsercion = 0;

            nuevas_mesas.forEach((mesa) => {
              db.run('INSERT INTO comanda_mesas (comanda_id, mesa_id) VALUES (?, ?)', [id, mesa.id], (err: any) => {
                if (err) {
                  console.error('Error al insertar relación mesa:', err);
                  erroresInsercion++;
                } else {
                  relacionesInsertadas++;
                }

                if (relacionesInsertadas + erroresInsercion === nuevas_mesas.length) {
                  if (erroresInsercion > 0) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al relacionar nuevas mesas' });
                  }

                  // 6. Liberar mesas anteriores
                  if (mesasAnterioresIds.length > 0) {
                    const placeholdersAnteriores = mesasAnterioresIds.map(() => '?').join(',');
                    db.run(
                      `UPDATE mesas SET ocupada = 0, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholdersAnteriores})`,
                      mesasAnterioresIds,
                      (err: any) => {
                        if (err) {
                          console.error('Error al liberar mesas anteriores:', err);
                          // No hacer rollback, el cambio ya se hizo
                          console.warn('⚠️  Mesas anteriores no liberadas, pero comanda actualizada');
                        } else {
                          console.log('✅ Mesas anteriores liberadas:', mesasAnterioresIds);
                        }
                        ocuparNuevasMesas();
                      }
                    );
                  } else {
                    ocuparNuevasMesas();
                  }

                  function ocuparNuevasMesas() {
                    // 7. Ocupar nuevas mesas
                    const placeholdersNuevas = mesasIds.map(() => '?').join(',');
                    db.run(
                      `UPDATE mesas SET ocupada = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholdersNuevas})`,
                      mesasIds,
                      (err: any) => {
                        if (err) {
                          console.error('Error al ocupar nuevas mesas:', err);
                          db.run('ROLLBACK');
                          return res.status(500).json({ error: 'Error al ocupar nuevas mesas' });
                        }

                        console.log('✅ Nuevas mesas ocupadas:', mesasIds);

                        // 8. Actualizar timestamp de la comanda
                        db.run('UPDATE comandas SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?', [id], (err: any) => {
                          if (err) {
                            console.error('Error al actualizar timestamp:', err);
                            // No hacer rollback por esto
                          }

                          // 9. Commit
                          db.run('COMMIT', (err: any) => {
                            if (err) {
                              console.error('Error en COMMIT:', err);
                              return res.status(500).json({ error: 'Error al confirmar cambios' });
                            }

                            console.log('✅ Cambio de mesa completado exitosamente');

                            // Retornar información del cambio
                            res.json({
                              message: 'Mesa(s) cambiada(s) exitosamente',
                              mesas_anteriores: mesasAnterioresIds,
                              mesas_nuevas: mesasIds,
                              comanda_id: id
                            });
                          });
                        });
                      }
                    );
                  }
                }
              });
            });
          });
        });
      });
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
      
      // Liberar mesas si existen
      if (mesaRows.length > 0) {
        const liberarMesasQuery = `
          UPDATE mesas 
          SET ocupada = 0, updated_at = CURRENT_TIMESTAMP 
          WHERE id IN (SELECT mesa_id FROM comanda_mesas WHERE comanda_id = ?)
        `;
        
        db.run(liberarMesasQuery, [id], (err: any) => {
          if (err) {
            console.error('Error al liberar mesas:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Error al liberar las mesas' });
          }
          
          console.log(`✅ Mesas liberadas automáticamente para comanda ${id} (eliminada)`);
          eliminarComanda();
        });
      } else {
        // No hay mesas que liberar, eliminar directamente
        eliminarComanda();
      }
      
      function eliminarComanda() {
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
});

export default router;

