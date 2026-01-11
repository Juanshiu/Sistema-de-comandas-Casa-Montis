import { Router, Request, Response } from 'express';
import { convertirAHoraColombia, getFechaISO_Colombia } from '../utils/dateUtils';
import { db } from '../database/init';
import { v4 as uuidv4 } from 'uuid';
import { imprimirFactura } from '../services/printer';
import { verificarAutenticacion, verificarPermiso } from '../middleware/authMiddleware';

const router = Router();

// Crear factura
router.post('/', verificarAutenticacion, verificarPermiso('gestionar_caja'), (req: Request, res: Response) => {
  const { comanda_id, metodo_pago, monto_pagado, cambio } = req.body;
  // c.usuario_nombre se usará para reemplazar mesero en la visualización
  const cajero = req.usuario?.nombre_completo || 'Cajero del Sistema';

  if (!comanda_id || !metodo_pago) {
    return res.status(400).json({ 
      error: 'Faltan campos requeridos: comanda_id, metodo_pago' 
    });
  }

  // Validar método de pago
  const metodosValidos = ['efectivo', 'tarjeta', 'transferencia', 'mixto'];
  if (!metodosValidos.includes(metodo_pago)) {
    return res.status(400).json({ 
      error: `Método de pago inválido. Métodos válidos: ${metodosValidos.join(', ')}` 
    });
  }

  // Verificar que la comanda existe y está lista
  const verificarComandaQuery = `
    SELECT c.*
    FROM comandas c
    WHERE c.id = ? AND c.estado = 'lista'
  `;

  db.get(verificarComandaQuery, [comanda_id], (err: any, comanda: any) => {
    if (err) {
      console.error('Error al verificar comanda:', err);
      return res.status(500).json({ error: 'Error al verificar la comanda' });
    }

    if (!comanda) {
      return res.status(404).json({ 
        error: 'Comanda no encontrada o no está en estado lista' 
      });
    }

    // Obtener las mesas de la comanda
    const mesasQuery = `
      SELECT m.* 
      FROM mesas m
      INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
      WHERE cm.comanda_id = ?
    `;

    db.all(mesasQuery, [comanda_id], (err: any, mesasRows: any[]) => {
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

      db.all(itemsQuery, [comanda_id], (err: any, itemsRows: any[]) => {
        if (err) {
          console.error('Error al obtener items de comanda:', err);
          return res.status(500).json({ error: 'Error al obtener los items de la comanda' });
        }

        const facturaId = uuidv4();
        const fechaCreacion = getFechaISO_Colombia();

        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          // Crear la factura
          const insertFacturaQuery = `
            INSERT INTO facturas (
              id, comanda_id, subtotal, total, 
              metodo_pago, cajero, monto_pagado, cambio, fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(insertFacturaQuery, [
            facturaId,
            comanda_id,
            comanda.subtotal,
            comanda.total,
            metodo_pago,
            cajero,
            monto_pagado || comanda.total,
            cambio || 0,
            fechaCreacion
          ], function(err: any) {
            if (err) {
              console.error('Error al crear factura:', err);
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Error al crear la factura' });
            }

            // Crear relaciones factura-mesas
            const insertFacturaMesaQuery = `
              INSERT INTO factura_mesas (factura_id, mesa_id)
              VALUES (?, ?)
            `;

            let mesasFacturadas = 0;
            let erroresMesas = 0;

            if (mesasRows.length === 0) {
              // Si no hay mesas, finalizar directamente
              finalizarFacturacion();
              return;
            }

            mesasRows.forEach((mesa) => {
              db.run(insertFacturaMesaQuery, [facturaId, mesa.id], (err: any) => {
                if (err) {
                  console.error('Error al relacionar mesa con factura:', err);
                  erroresMesas++;
                } else {
                  mesasFacturadas++;
                }

                if (mesasFacturadas + erroresMesas === mesasRows.length) {
                  if (erroresMesas > 0) {
                    console.warn(`${erroresMesas} errores al relacionar mesas con factura`);
                  }
                  finalizarFacturacion();
                }
              });
            });

            function finalizarFacturacion() {
              // Liberar las mesas (marcarlas como no ocupadas) solo si hay mesas asociadas
              if (mesasRows.length > 0) {
                const liberarMesasQuery = `
                  UPDATE mesas 
                  SET ocupada = 0, updated_at = CURRENT_TIMESTAMP 
                  WHERE id IN (SELECT mesa_id FROM comanda_mesas WHERE comanda_id = ?)
                `;

                db.run(liberarMesasQuery, [comanda_id], (err: any) => {
                  if (err) {
                    console.error('Error al liberar mesas:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al liberar las mesas' });
                  }
                  
                  console.log(`✅ Mesas liberadas automáticamente para comanda ${comanda_id} (facturada)`);
                  actualizarComandaYFinalizar();
                });
              } else {
                // Si no hay mesas (domicilio), continuar directamente
                actualizarComandaYFinalizar();
              }

              function actualizarComandaYFinalizar() {
                // Actualizar estado de la comanda a 'facturada'
                const actualizarComandaQuery = `
                  UPDATE comandas 
                  SET estado = 'facturada', fecha_actualizacion = CURRENT_TIMESTAMP 
                  WHERE id = ?
                `;

                db.run(actualizarComandaQuery, [comanda_id], (err: any) => {
                  if (err) {
                    console.error('Error al actualizar estado de comanda:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al actualizar el estado de la comanda' });
                  }

                  db.run('COMMIT', (err: any) => {
                    if (err) {
                      console.error('Error al hacer commit:', err);
                      return res.status(500).json({ error: 'Error al procesar la factura' });
                    }

                    // Preparar datos de la factura para respuesta e impresión
                    const facturaCompleta = {
                      id: facturaId,
                      comanda_id: comanda_id,
                      mesas: mesasRows.map(mesa => ({
                        id: mesa.id,
                        numero: mesa.numero,
                        capacidad: mesa.capacidad,
                        salon: mesa.salon
                      })),
                      items: itemsRows.map(item => ({
                        id: item.id,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario,
                        subtotal: item.subtotal,
                        observaciones: item.observaciones,
                        producto: {
                          id: item.producto_id,
                          nombre: item.producto_nombre,
                          precio: item.producto_precio,
                          categoria: item.producto_categoria
                        }
                      })),
                      subtotal: comanda.subtotal,
                      total: comanda.total,
                      metodo_pago: metodo_pago,
                      cajero: cajero,
                      fecha_creacion: convertirAHoraColombia(fechaCreacion)
                    };

                    // Imprimir factura
                    try {
                      imprimirFactura(facturaCompleta);
                    } catch (error) {
                      console.error('Error al imprimir factura:', error);
                    }

                    res.status(201).json({
                      message: 'Factura creada exitosamente',
                      factura: facturaCompleta
                    });
                  });
                });
              }
            }
          });
        });
      });
    });
  });
});

// Obtener todas las facturas
router.get('/', (req: Request, res: Response) => {
  const query = `
    SELECT 
      f.*,
      f.*,
      c.mesero,
      c.usuario_nombre,
      c.observaciones_generales
    FROM facturas f
    JOIN comandas c ON f.comanda_id = c.id
    ORDER BY f.fecha_creacion DESC
  `;

  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener facturas:', err);
      return res.status(500).json({ error: 'Error al obtener las facturas' });
    }

    if (rows.length === 0) {
      return res.json([]);
    }

    // Obtener las mesas para cada factura
    const facturasPromises = rows.map((row: any) => {
      return new Promise((resolve, reject) => {
        // Obtener mesas de la factura a través de la comanda
        const mesasQuery = `
          SELECT m.* 
          FROM mesas m
          INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
          WHERE cm.comanda_id = ?
        `;
        
        db.all(mesasQuery, [row.comanda_id], (err: any, mesasRows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const factura = {
            id: row.id,
            comanda_id: row.comanda_id,
            mesas: mesasRows.map(mesa => ({
              id: mesa.id,
              numero: mesa.numero,
              capacidad: mesa.capacidad,
              salon: mesa.salon
            })),
            subtotal: row.subtotal,
            total: row.total,
            metodo_pago: row.metodo_pago,
            cajero: row.cajero,
            mesero: row.usuario_nombre || row.mesero,
            fecha_creacion: convertirAHoraColombia(row.fecha_creacion)
          };
          
          resolve(factura);
        });
      });
    });

    Promise.all(facturasPromises)
      .then(facturas => res.json(facturas))
      .catch(err => {
        console.error('Error al obtener mesas de facturas:', err);
        res.status(500).json({ error: 'Error al obtener las facturas' });
      });
  });
});

// Obtener una factura específica
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const query = `
    SELECT 
      f.*,
      f.*,
      c.mesero,
      c.usuario_nombre,
      c.observaciones_generales
    FROM facturas f
    JOIN comandas c ON f.comanda_id = c.id
    WHERE f.id = ?
  `;

  db.get(query, [id], (err: any, facturaRow: any) => {
    if (err) {
      console.error('Error al obtener factura:', err);
      return res.status(500).json({ error: 'Error al obtener la factura' });
    }

    if (!facturaRow) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    // Obtener las mesas de la factura
    const mesasQuery = `
      SELECT m.* 
      FROM mesas m
      INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
      WHERE cm.comanda_id = ?
    `;

    db.all(mesasQuery, [facturaRow.comanda_id], (err: any, mesasRows: any[]) => {
      if (err) {
        console.error('Error al obtener mesas de factura:', err);
        return res.status(500).json({ error: 'Error al obtener las mesas de la factura' });
      }

      // Obtener los items de la factura
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

      db.all(itemsQuery, [facturaRow.comanda_id], (err: any, itemsRows: any[]) => {
        if (err) {
          console.error('Error al obtener items de factura:', err);
          return res.status(500).json({ error: 'Error al obtener los items de la factura' });
        }

        const factura = {
          id: facturaRow.id,
          comanda_id: facturaRow.comanda_id,
          mesas: mesasRows.map(mesa => ({
            id: mesa.id,
            numero: mesa.numero,
            capacidad: mesa.capacidad,
            salon: mesa.salon
          })),
          items: itemsRows.map(item => ({
            id: item.id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal,
            observaciones: item.observaciones,
            producto: {
              id: item.producto_id,
              nombre: item.producto_nombre,
              precio: item.producto_precio,
              categoria: item.producto_categoria
            }
          })),
          subtotal: facturaRow.subtotal,
          total: facturaRow.total,
          metodo_pago: facturaRow.metodo_pago,
          cajero: facturaRow.cajero,
          mesero: facturaRow.usuario_nombre || facturaRow.mesero,
          fecha_creacion: convertirAHoraColombia(facturaRow.fecha_creacion)
        };

        res.json(factura);
      });
    });
  });
});

// Obtener facturas por rango de fechas
router.get('/fecha/:inicio/:fin', (req: Request, res: Response) => {
  const { inicio, fin } = req.params;

  const query = `
    SELECT 
      f.*,
      f.*,
      c.mesero,
      c.usuario_nombre
    FROM facturas f
    JOIN comandas c ON f.comanda_id = c.id
    WHERE DATE(f.fecha_creacion) BETWEEN DATE(?) AND DATE(?)
    ORDER BY f.fecha_creacion DESC
  `;

  db.all(query, [inicio, fin], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener facturas por fecha:', err);
      return res.status(500).json({ error: 'Error al obtener las facturas' });
    }

    res.json(rows);
  });
});

export default router;

