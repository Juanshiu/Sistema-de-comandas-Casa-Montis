"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const init_1 = require("../database/init");
const uuid_1 = require("uuid");
const printer_nuevo_1 = require("../services/printer-nuevo");
const router = (0, express_1.Router)();
// Crear factura
router.post('/', (req, res) => {
    const { comanda_id, metodo_pago, cajero } = req.body;
    if (!comanda_id || !metodo_pago || !cajero) {
        return res.status(400).json({
            error: 'Faltan campos requeridos: comanda_id, metodo_pago, cajero'
        });
    }
    // Validar método de pago
    const metodosValidos = ['efectivo', 'tarjeta', 'transferencia', 'mixto'];
    if (!metodosValidos.includes(metodo_pago)) {
        return res.status(400).json({
            error: `Método de pago inválido. Métodos válidos: ${metodosValidos.join(', ')}`
        });
    }
    // Verificar que la comanda existe y está entregada
    const verificarComandaQuery = `
    SELECT c.*
    FROM comandas c
    WHERE c.id = ? AND c.estado = 'entregada'
  `;
    init_1.db.get(verificarComandaQuery, [comanda_id], (err, comanda) => {
        if (err) {
            console.error('Error al verificar comanda:', err);
            return res.status(500).json({ error: 'Error al verificar la comanda' });
        }
        if (!comanda) {
            return res.status(404).json({
                error: 'Comanda no encontrada o no está en estado entregada'
            });
        }
        // Obtener las mesas de la comanda
        const mesasQuery = `
      SELECT m.* 
      FROM mesas m
      INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
      WHERE cm.comanda_id = ?
    `;
        init_1.db.all(mesasQuery, [comanda_id], (err, mesasRows) => {
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
            init_1.db.all(itemsQuery, [comanda_id], (err, itemsRows) => {
                if (err) {
                    console.error('Error al obtener items de comanda:', err);
                    return res.status(500).json({ error: 'Error al obtener los items de la comanda' });
                }
                const facturaId = (0, uuid_1.v4)();
                const fechaCreacion = new Date().toISOString();
                init_1.db.serialize(() => {
                    init_1.db.run('BEGIN TRANSACTION');
                    // Crear la factura
                    const insertFacturaQuery = `
            INSERT INTO facturas (
              id, comanda_id, subtotal, total, 
              metodo_pago, cajero, fecha_creacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
                    init_1.db.run(insertFacturaQuery, [
                        facturaId,
                        comanda_id,
                        comanda.subtotal,
                        comanda.total,
                        metodo_pago,
                        cajero,
                        fechaCreacion
                    ], function (err) {
                        if (err) {
                            console.error('Error al crear factura:', err);
                            init_1.db.run('ROLLBACK');
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
                            init_1.db.run(insertFacturaMesaQuery, [facturaId, mesa.id], (err) => {
                                if (err) {
                                    console.error('Error al relacionar mesa con factura:', err);
                                    erroresMesas++;
                                }
                                else {
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
                            // Liberar las mesas (marcarlas como no ocupadas)
                            const liberarMesasQuery = `
                UPDATE mesas 
                SET ocupada = 0 
                WHERE id IN (SELECT mesa_id FROM comanda_mesas WHERE comanda_id = ?)
              `;
                            init_1.db.run(liberarMesasQuery, [comanda_id], (err) => {
                                if (err) {
                                    console.error('Error al liberar mesas:', err);
                                    init_1.db.run('ROLLBACK');
                                    return res.status(500).json({ error: 'Error al liberar las mesas' });
                                }
                                // Actualizar estado de la comanda a 'facturada'
                                const actualizarComandaQuery = `
                  UPDATE comandas 
                  SET estado = 'facturada', fecha_actualizacion = CURRENT_TIMESTAMP 
                  WHERE id = ?
                `;
                                init_1.db.run(actualizarComandaQuery, [comanda_id], (err) => {
                                    if (err) {
                                        console.error('Error al actualizar estado de comanda:', err);
                                        init_1.db.run('ROLLBACK');
                                        return res.status(500).json({ error: 'Error al actualizar el estado de la comanda' });
                                    }
                                    init_1.db.run('COMMIT', (err) => {
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
                                            fecha_creacion: new Date(fechaCreacion)
                                        };
                                        // Imprimir factura
                                        try {
                                            (0, printer_nuevo_1.imprimirFactura)(facturaCompleta);
                                        }
                                        catch (error) {
                                            console.error('Error al imprimir factura:', error);
                                        }
                                        res.status(201).json({
                                            message: 'Factura creada exitosamente',
                                            factura: facturaCompleta
                                        });
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
// Obtener todas las facturas
router.get('/', (req, res) => {
    const query = `
    SELECT 
      f.*,
      c.mesero,
      c.observaciones_generales
    FROM facturas f
    JOIN comandas c ON f.comanda_id = c.id
    ORDER BY f.fecha_creacion DESC
  `;
    init_1.db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener facturas:', err);
            return res.status(500).json({ error: 'Error al obtener las facturas' });
        }
        if (rows.length === 0) {
            return res.json([]);
        }
        // Obtener las mesas para cada factura
        const facturasPromises = rows.map((row) => {
            return new Promise((resolve, reject) => {
                // Obtener mesas de la factura a través de la comanda
                const mesasQuery = `
          SELECT m.* 
          FROM mesas m
          INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
          WHERE cm.comanda_id = ?
        `;
                init_1.db.all(mesasQuery, [row.comanda_id], (err, mesasRows) => {
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
                        mesero: row.mesero,
                        fecha_creacion: new Date(row.fecha_creacion)
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
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const query = `
    SELECT 
      f.*,
      c.mesero,
      c.observaciones_generales
    FROM facturas f
    JOIN comandas c ON f.comanda_id = c.id
    WHERE f.id = ?
  `;
    init_1.db.get(query, [id], (err, facturaRow) => {
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
        init_1.db.all(mesasQuery, [facturaRow.comanda_id], (err, mesasRows) => {
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
      `;
            init_1.db.all(itemsQuery, [facturaRow.comanda_id], (err, itemsRows) => {
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
                    mesero: facturaRow.mesero,
                    fecha_creacion: new Date(facturaRow.fecha_creacion)
                };
                res.json(factura);
            });
        });
    });
});
// Obtener facturas por rango de fechas
router.get('/fecha/:inicio/:fin', (req, res) => {
    const { inicio, fin } = req.params;
    const query = `
    SELECT 
      f.*,
      c.mesero
    FROM facturas f
    JOIN comandas c ON f.comanda_id = c.id
    WHERE DATE(f.fecha_creacion) BETWEEN DATE(?) AND DATE(?)
    ORDER BY f.fecha_creacion DESC
  `;
    init_1.db.all(query, [inicio, fin], (err, rows) => {
        if (err) {
            console.error('Error al obtener facturas por fecha:', err);
            return res.status(500).json({ error: 'Error al obtener las facturas' });
        }
        res.json(rows);
    });
});
exports.default = router;
//# sourceMappingURL=facturas.js.map