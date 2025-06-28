"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const init_1 = require("../database/init");
const uuid_1 = require("uuid");
const printer_1 = require("../services/printer");
const router = (0, express_1.Router)();
// Obtener todas las comandas
router.get('/', (req, res) => {
    const query = `
    SELECT 
      c.*,
      m.numero as mesa_numero,
      m.capacidad as mesa_capacidad
    FROM comandas c
    JOIN mesas m ON c.mesa_id = m.id
    ORDER BY c.fecha_creacion DESC
  `;
    init_1.db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener comandas:', err);
            return res.status(500).json({ error: 'Error al obtener las comandas' });
        }
        const comandas = rows.map(row => ({
            id: row.id,
            mesa_id: row.mesa_id,
            mesero: row.mesero,
            subtotal: row.subtotal,
            total: row.total,
            estado: row.estado,
            observaciones_generales: row.observaciones_generales,
            fecha_creacion: new Date(row.fecha_creacion),
            fecha_actualizacion: new Date(row.fecha_actualizacion),
            mesa: {
                id: row.mesa_id,
                numero: row.mesa_numero,
                capacidad: row.mesa_capacidad,
                ocupada: true
            }
        }));
        res.json(comandas);
    });
});
// Obtener una comanda específica con sus items
router.get('/activas', (req, res) => {
    const query = `
    SELECT 
      c.*,
      m.numero as mesa_numero,
      m.capacidad as mesa_capacidad
    FROM comandas c
    JOIN mesas m ON c.mesa_id = m.id
    WHERE c.estado NOT IN ('facturada', 'cancelada')
    ORDER BY c.fecha_creacion DESC
  `;
    init_1.db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener comandas activas:', err);
            return res.status(500).json({ error: 'Error al obtener las comandas activas' });
        }
        const comandas = rows.map(row => ({
            id: row.id,
            mesa_id: row.mesa_id,
            mesero: row.mesero,
            subtotal: row.subtotal,
            total: row.total,
            estado: row.estado,
            observaciones_generales: row.observaciones_generales,
            fecha_creacion: new Date(row.fecha_creacion),
            fecha_actualizacion: new Date(row.fecha_actualizacion),
            mesa: {
                id: row.mesa_id,
                numero: row.mesa_numero,
                capacidad: row.mesa_capacidad,
                ocupada: true
            }
        }));
        // Obtener items para cada comanda
        Promise.all(comandas.map(comanda => {
            return new Promise((resolve) => {
                const itemsQuery = `
          SELECT 
            ci.*,
            p.nombre as producto_nombre,
            p.descripcion as producto_descripcion,
            p.categoria as producto_categoria
          FROM comanda_items ci
          JOIN productos p ON ci.producto_id = p.id
          WHERE ci.comanda_id = ?
        `;
                init_1.db.all(itemsQuery, [comanda.id], (err, itemsRows) => {
                    if (err) {
                        console.error('Error al obtener items:', err);
                        resolve({ ...comanda, items: [] });
                        return;
                    }
                    const items = itemsRows.map(item => ({
                        id: item.id,
                        comanda_id: item.comanda_id,
                        producto_id: item.producto_id,
                        cantidad: item.cantidad,
                        precio_unitario: item.precio_unitario,
                        subtotal: item.subtotal,
                        observaciones: item.observaciones,
                        personalizacion: item.personalizacion ? JSON.parse(item.personalizacion) : null,
                        producto: {
                            id: item.producto_id,
                            nombre: item.producto_nombre,
                            descripcion: item.producto_descripcion,
                            categoria: item.producto_categoria,
                            precio: item.precio_unitario,
                            disponible: true
                        }
                    }));
                    resolve({ ...comanda, items });
                });
            });
        }))
            .then(comandasConItems => {
            res.json(comandasConItems);
        })
            .catch(error => {
            console.error('Error al procesar comandas:', error);
            res.status(500).json({ error: 'Error al procesar las comandas' });
        });
    });
});
// Obtener una comanda específica con sus items
router.get('/:id', (req, res) => {
    const { id } = req.params;
    // Obtener comanda
    const comandaQuery = `
    SELECT 
      c.*,
      m.numero as mesa_numero,
      m.capacidad as mesa_capacidad,
      m.ocupada as mesa_ocupada
    FROM comandas c
    JOIN mesas m ON c.mesa_id = m.id
    WHERE c.id = ?
  `;
    init_1.db.get(comandaQuery, [id], (err, comandaRow) => {
        if (err) {
            console.error('Error al obtener comanda:', err);
            return res.status(500).json({ error: 'Error al obtener la comanda' });
        }
        if (!comandaRow) {
            return res.status(404).json({ error: 'Comanda no encontrada' });
        }
        // Obtener items de la comanda
        const itemsQuery = `
      SELECT 
        ci.*,
        p.nombre as producto_nombre,
        p.descripcion as producto_descripcion,
        p.categoria as producto_categoria
      FROM comanda_items ci
      JOIN productos p ON ci.producto_id = p.id
      WHERE ci.comanda_id = ?
    `;
        init_1.db.all(itemsQuery, [id], (err, itemsRows) => {
            if (err) {
                console.error('Error al obtener items de comanda:', err);
                return res.status(500).json({ error: 'Error al obtener los items de la comanda' });
            }
            const items = itemsRows.map(item => ({
                id: item.id,
                comanda_id: item.comanda_id,
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                subtotal: item.subtotal,
                observaciones: item.observaciones,
                created_at: new Date(item.created_at),
                producto: {
                    id: item.producto_id,
                    nombre: item.producto_nombre,
                    descripcion: item.producto_descripcion,
                    categoria: item.producto_categoria,
                    precio: item.precio_unitario,
                    disponible: true
                }
            }));
            const comanda = {
                id: comandaRow.id,
                mesa_id: comandaRow.mesa_id,
                mesero: comandaRow.mesero,
                subtotal: comandaRow.subtotal,
                total: comandaRow.total,
                estado: comandaRow.estado,
                observaciones_generales: comandaRow.observaciones_generales,
                fecha_creacion: new Date(comandaRow.fecha_creacion),
                fecha_actualizacion: new Date(comandaRow.fecha_actualizacion),
                mesa: {
                    id: comandaRow.mesa_id,
                    numero: comandaRow.mesa_numero,
                    capacidad: comandaRow.mesa_capacidad,
                    ocupada: Boolean(comandaRow.mesa_ocupada)
                },
                items
            };
            res.json(comanda);
        });
    });
});
// Crear nueva comanda
router.post('/', async (req, res) => {
    const comandaData = req.body;
    if (!comandaData.mesa || !comandaData.items || comandaData.items.length === 0) {
        return res.status(400).json({
            error: 'Mesa e items son requeridos'
        });
    }
    const comandaId = (0, uuid_1.v4)();
    // Iniciar transacción
    init_1.db.serialize(() => {
        init_1.db.run('BEGIN TRANSACTION');
        // Insertar comanda
        const insertComandaQuery = `
      INSERT INTO comandas (id, mesa_id, mesero, subtotal, total, observaciones_generales)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        init_1.db.run(insertComandaQuery, [
            comandaId,
            comandaData.mesa.id,
            comandaData.mesero,
            comandaData.subtotal,
            comandaData.total,
            comandaData.observaciones_generales
        ], function (err) {
            if (err) {
                console.error('Error al crear comanda:', err);
                init_1.db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al crear la comanda' });
            }
            // Insertar items
            let itemsInserted = 0;
            const totalItems = comandaData.items.length;
            comandaData.items.forEach((item, index) => {
                const itemId = (0, uuid_1.v4)();
                const insertItemQuery = `
          INSERT INTO comanda_items (id, comanda_id, producto_id, cantidad, precio_unitario, subtotal, observaciones, personalizacion)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
                init_1.db.run(insertItemQuery, [
                    itemId,
                    comandaId,
                    item.producto.id,
                    item.cantidad,
                    item.precio_unitario,
                    item.subtotal,
                    item.observaciones,
                    item.personalizacion ? JSON.stringify(item.personalizacion) : null
                ], function (err) {
                    if (err) {
                        console.error('Error al insertar item:', err);
                        init_1.db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error al crear los items de la comanda' });
                    }
                    itemsInserted++;
                    // Si es el último item, marcar mesa como ocupada y confirmar transacción
                    if (itemsInserted === totalItems) {
                        init_1.db.run('UPDATE mesas SET ocupada = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [comandaData.mesa.id], (err) => {
                            if (err) {
                                console.error('Error al actualizar mesa:', err);
                                init_1.db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Error al actualizar el estado de la mesa' });
                            }
                            init_1.db.run('COMMIT', (err) => {
                                if (err) {
                                    console.error('Error al confirmar transacción:', err);
                                    return res.status(500).json({ error: 'Error al confirmar la transacción' });
                                }
                                // Obtener la comanda completa creada
                                const getComandaQuery = `
                    SELECT 
                      c.*,
                      m.numero as mesa_numero,
                      m.capacidad as mesa_capacidad,
                      m.ocupada as mesa_ocupada
                    FROM comandas c
                    JOIN mesas m ON c.mesa_id = m.id
                    WHERE c.id = ?
                  `;
                                init_1.db.get(getComandaQuery, [comandaId], (err, comandaRow) => {
                                    if (err) {
                                        console.error('Error al obtener comanda creada:', err);
                                        return res.status(500).json({ error: 'Error al obtener la comanda creada' });
                                    }
                                    const comanda = {
                                        id: comandaRow.id,
                                        mesa_id: comandaRow.mesa_id,
                                        mesero: comandaRow.mesero,
                                        subtotal: comandaRow.subtotal,
                                        total: comandaRow.total,
                                        estado: comandaRow.estado,
                                        observaciones_generales: comandaRow.observaciones_generales,
                                        fecha_creacion: new Date(comandaRow.fecha_creacion),
                                        fecha_actualizacion: new Date(comandaRow.fecha_actualizacion),
                                        mesa: {
                                            id: comandaRow.mesa_id,
                                            numero: comandaRow.mesa_numero,
                                            capacidad: comandaRow.mesa_capacidad,
                                            ocupada: Boolean(comandaRow.mesa_ocupada)
                                        }
                                    };
                                    res.status(201).json(comanda);
                                });
                            });
                        });
                    }
                });
            });
        });
    });
});
// Actualizar estado de comanda
router.patch('/:id/estado', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const estadosValidos = ['pendiente', 'preparando', 'lista', 'entregada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido' });
    }
    const query = 'UPDATE comandas SET estado = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?';
    init_1.db.run(query, [estado, id], function (err) {
        if (err) {
            console.error('Error al actualizar estado de comanda:', err);
            return res.status(500).json({ error: 'Error al actualizar el estado de la comanda' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Comanda no encontrada' });
        }
        // Si la comanda se entrega, liberar la mesa
        if (estado === 'entregada') {
            init_1.db.get('SELECT mesa_id FROM comandas WHERE id = ?', [id], (err, row) => {
                if (err) {
                    console.error('Error al obtener mesa de comanda:', err);
                }
                else if (row) {
                    init_1.db.run('UPDATE mesas SET ocupada = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [row.mesa_id], (err) => {
                        if (err) {
                            console.error('Error al liberar mesa:', err);
                        }
                    });
                }
            });
        }
        res.json({ message: 'Estado actualizado correctamente', estado });
    });
});
// Imprimir comanda
router.post('/:id/imprimir', async (req, res) => {
    const { id } = req.params;
    try {
        await (0, printer_1.imprimirComanda)(id);
        res.json({ message: 'Comanda enviada a impresora' });
    }
    catch (error) {
        console.error('Error al imprimir comanda:', error);
        res.status(500).json({ error: 'Error al imprimir la comanda' });
    }
});
// Eliminar comanda
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    init_1.db.serialize(() => {
        init_1.db.run('BEGIN TRANSACTION');
        // Obtener mesa_id antes de eliminar
        init_1.db.get('SELECT mesa_id FROM comandas WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Error al obtener comanda:', err);
                init_1.db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al obtener la comanda' });
            }
            if (!row) {
                init_1.db.run('ROLLBACK');
                return res.status(404).json({ error: 'Comanda no encontrada' });
            }
            const mesaId = row.mesa_id;
            // Eliminar items de comanda
            init_1.db.run('DELETE FROM comanda_items WHERE comanda_id = ?', [id], (err) => {
                if (err) {
                    console.error('Error al eliminar items:', err);
                    init_1.db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al eliminar los items de la comanda' });
                }
                // Eliminar comanda
                init_1.db.run('DELETE FROM comandas WHERE id = ?', [id], function (err) {
                    if (err) {
                        console.error('Error al eliminar comanda:', err);
                        init_1.db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error al eliminar la comanda' });
                    }
                    // Liberar mesa
                    init_1.db.run('UPDATE mesas SET ocupada = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [mesaId], (err) => {
                        if (err) {
                            console.error('Error al liberar mesa:', err);
                            init_1.db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Error al liberar la mesa' });
                        }
                        init_1.db.run('COMMIT', (err) => {
                            if (err) {
                                console.error('Error al confirmar eliminación:', err);
                                return res.status(500).json({ error: 'Error al confirmar la eliminación' });
                            }
                            res.json({ message: 'Comanda eliminada correctamente' });
                        });
                    });
                });
            });
        });
    });
});
exports.default = router;
//# sourceMappingURL=comandas-old.js.map