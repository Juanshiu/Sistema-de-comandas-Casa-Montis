"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const init_1 = require("../database/init");
const uuid_1 = require("uuid");
const printer_nuevo_1 = require("../services/printer-nuevo");
const router = (0, express_1.Router)();
// Obtener todas las comandas
router.get('/', (req, res) => {
    const query = `
    SELECT 
      c.*
    FROM comandas c
    ORDER BY c.fecha_creacion DESC
  `;
    init_1.db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener comandas:', err);
            return res.status(500).json({ error: 'Error al obtener las comandas' });
        }
        if (rows.length === 0) {
            return res.json([]);
        }
        // Obtener las mesas para cada comanda
        const comandasPromises = rows.map((row) => {
            return new Promise((resolve, reject) => {
                const mesasQuery = `
          SELECT m.* 
          FROM mesas m
          INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
          WHERE cm.comanda_id = ?
        `;
                init_1.db.all(mesasQuery, [row.id], (err, mesasRows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const comanda = {
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
router.get('/activas', (req, res) => {
    const query = `
    SELECT 
      c.*
    FROM comandas c
    WHERE c.estado IN ('pendiente', 'preparando', 'lista')
    ORDER BY c.fecha_creacion DESC
  `;
    init_1.db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener comandas activas:', err);
            return res.status(500).json({ error: 'Error al obtener las comandas activas' });
        }
        if (rows.length === 0) {
            return res.json([]);
        }
        // Obtener las mesas para cada comanda
        const comandasPromises = rows.map((row) => {
            return new Promise((resolve, reject) => {
                const mesasQuery = `
          SELECT m.* 
          FROM mesas m
          INNER JOIN comanda_mesas cm ON m.id = cm.mesa_id
          WHERE cm.comanda_id = ?
        `;
                init_1.db.all(mesasQuery, [row.id], (err, mesasRows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    const comanda = {
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
            console.error('Error al obtener mesas de comandas activas:', err);
            res.status(500).json({ error: 'Error al obtener las comandas activas' });
        });
    });
});
// Obtener una comanda específica con sus items
router.get('/:id', (req, res) => {
    const { id } = req.params;
    // Obtener la comanda
    const comandaQuery = 'SELECT * FROM comandas WHERE id = ?';
    init_1.db.get(comandaQuery, [id], (err, comandaRow) => {
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
        init_1.db.all(mesasQuery, [id], (err, mesasRows) => {
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
            init_1.db.all(itemsQuery, [id], (err, itemsRows) => {
                if (err) {
                    console.error('Error al obtener items de comanda:', err);
                    return res.status(500).json({ error: 'Error al obtener los items de la comanda' });
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
                    created_at: new Date(row.created_at),
                    producto: {
                        id: row.producto_id,
                        nombre: row.producto_nombre,
                        precio: row.producto_precio,
                        categoria: row.producto_categoria,
                        disponible: true
                    }
                }));
                const comanda = {
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
router.post('/', (req, res) => {
    const comandaData = req.body;
    // Validar datos requeridos
    if (!comandaData.mesas || comandaData.mesas.length === 0 || !comandaData.items || comandaData.items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos requeridos: mesas e items' });
    }
    if (!comandaData.mesero || comandaData.mesero.trim() === '') {
        return res.status(400).json({ error: 'El nombre del mesero es requerido' });
    }
    const comandaId = (0, uuid_1.v4)();
    init_1.db.serialize(() => {
        init_1.db.run('BEGIN TRANSACTION');
        // Insertar comanda
        const insertComandaQuery = `
      INSERT INTO comandas (id, mesero, subtotal, total, observaciones_generales)
      VALUES (?, ?, ?, ?, ?)
    `;
        init_1.db.run(insertComandaQuery, [
            comandaId,
            comandaData.mesero,
            comandaData.subtotal,
            comandaData.total,
            comandaData.observaciones_generales || null
        ], function (err) {
            if (err) {
                console.error('Error al insertar comanda:', err);
                init_1.db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al crear la comanda' });
            }
            // Insertar relaciones de mesas
            const insertMesaQuery = 'INSERT INTO comanda_mesas (comanda_id, mesa_id) VALUES (?, ?)';
            let mesasInserted = 0;
            let mesasErrors = 0;
            comandaData.mesas.forEach((mesa) => {
                init_1.db.run(insertMesaQuery, [comandaId, mesa.id], (err) => {
                    if (err) {
                        console.error('Error al relacionar mesa:', err);
                        mesasErrors++;
                    }
                    else {
                        mesasInserted++;
                    }
                    // Verificar si todas las mesas han sido procesadas
                    if (mesasInserted + mesasErrors === comandaData.mesas.length) {
                        if (mesasErrors > 0) {
                            init_1.db.run('ROLLBACK');
                            return res.status(500).json({ error: 'Error al relacionar mesas con la comanda' });
                        }
                        // Marcar mesas como ocupadas
                        const updateMesaQuery = 'UPDATE mesas SET ocupada = 1 WHERE id = ?';
                        let mesasUpdated = 0;
                        let updateErrors = 0;
                        comandaData.mesas.forEach((mesa) => {
                            init_1.db.run(updateMesaQuery, [mesa.id], (err) => {
                                if (err) {
                                    console.error('Error al ocupar mesa:', err);
                                    updateErrors++;
                                }
                                else {
                                    mesasUpdated++;
                                }
                                // Verificar si todas las mesas han sido actualizadas
                                if (mesasUpdated + updateErrors === comandaData.mesas.length) {
                                    if (updateErrors > 0) {
                                        init_1.db.run('ROLLBACK');
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
                                        const itemId = (0, uuid_1.v4)();
                                        const personalizacionStr = item.personalizacion ? JSON.stringify(item.personalizacion) : null;
                                        init_1.db.run(insertItemQuery, [
                                            itemId,
                                            comandaId,
                                            item.producto.id,
                                            item.cantidad,
                                            item.precio_unitario,
                                            item.subtotal,
                                            item.observaciones || null,
                                            personalizacionStr
                                        ], (err) => {
                                            if (err) {
                                                console.error('Error al insertar item:', err);
                                                itemsErrors++;
                                            }
                                            else {
                                                itemsInserted++;
                                            }
                                            // Verificar si todos los items han sido procesados
                                            if (itemsInserted + itemsErrors === comandaData.items.length) {
                                                if (itemsErrors > 0) {
                                                    init_1.db.run('ROLLBACK');
                                                    return res.status(500).json({ error: 'Error al crear los items de la comanda' });
                                                }
                                                init_1.db.run('COMMIT', (err) => {
                                                    if (err) {
                                                        console.error('Error al hacer commit:', err);
                                                        return res.status(500).json({ error: 'Error al guardar la comanda' });
                                                    }
                                                    // Obtener la comanda creada
                                                    const getComandaQuery = 'SELECT * FROM comandas WHERE id = ?';
                                                    init_1.db.get(getComandaQuery, [comandaId], (err, comandaRow) => {
                                                        if (err) {
                                                            console.error('Error al obtener comanda creada:', err);
                                                            return res.status(500).json({ error: 'Comanda creada pero error al obtener datos' });
                                                        }
                                                        const comanda = {
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
                                                            (0, printer_nuevo_1.imprimirComanda)(comanda);
                                                        }
                                                        catch (error) {
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
router.patch('/:id/estado', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const estadosValidos = ['pendiente', 'preparando', 'lista', 'entregada', 'cancelada'];
    if (!estado || !estadosValidos.includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
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
        res.json({ message: 'Estado de comanda actualizado exitosamente' });
    });
});
// Eliminar comanda
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    init_1.db.serialize(() => {
        init_1.db.run('BEGIN TRANSACTION');
        // Obtener las mesas de la comanda para liberarlas
        const getMesasQuery = `
      SELECT mesa_id 
      FROM comanda_mesas 
      WHERE comanda_id = ?
    `;
        init_1.db.all(getMesasQuery, [id], (err, mesaRows) => {
            if (err) {
                console.error('Error al obtener mesas de comanda:', err);
                init_1.db.run('ROLLBACK');
                return res.status(500).json({ error: 'Error al obtener las mesas de la comanda' });
            }
            // Liberar mesas
            if (mesaRows.length > 0) {
                const liberarMesaQuery = 'UPDATE mesas SET ocupada = 0 WHERE id = ?';
                let mesasLiberadas = 0;
                let erroresLiberacion = 0;
                mesaRows.forEach((mesaRow) => {
                    init_1.db.run(liberarMesaQuery, [mesaRow.mesa_id], (err) => {
                        if (err) {
                            console.error('Error al liberar mesa:', err);
                            erroresLiberacion++;
                        }
                        else {
                            mesasLiberadas++;
                        }
                        if (mesasLiberadas + erroresLiberacion === mesaRows.length) {
                            if (erroresLiberacion > 0) {
                                init_1.db.run('ROLLBACK');
                                return res.status(500).json({ error: 'Error al liberar las mesas' });
                            }
                            // Eliminar comanda (CASCADE eliminará items y relaciones)
                            const deleteComandaQuery = 'DELETE FROM comandas WHERE id = ?';
                            init_1.db.run(deleteComandaQuery, [id], function (err) {
                                if (err) {
                                    console.error('Error al eliminar comanda:', err);
                                    init_1.db.run('ROLLBACK');
                                    return res.status(500).json({ error: 'Error al eliminar la comanda' });
                                }
                                if (this.changes === 0) {
                                    init_1.db.run('ROLLBACK');
                                    return res.status(404).json({ error: 'Comanda no encontrada' });
                                }
                                init_1.db.run('COMMIT', (err) => {
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
            }
            else {
                // No hay mesas que liberar, eliminar directamente
                const deleteComandaQuery = 'DELETE FROM comandas WHERE id = ?';
                init_1.db.run(deleteComandaQuery, [id], function (err) {
                    if (err) {
                        console.error('Error al eliminar comanda:', err);
                        init_1.db.run('ROLLBACK');
                        return res.status(500).json({ error: 'Error al eliminar la comanda' });
                    }
                    if (this.changes === 0) {
                        init_1.db.run('ROLLBACK');
                        return res.status(404).json({ error: 'Comanda no encontrada' });
                    }
                    init_1.db.run('COMMIT', (err) => {
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
exports.default = router;
//# sourceMappingURL=comandas.js.map