"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const init_1 = require("../database/init");
const router = (0, express_1.Router)();
// Obtener todos los productos
router.get('/', (req, res) => {
    const query = 'SELECT * FROM productos WHERE disponible = 1 ORDER BY categoria, nombre';
    init_1.db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos:', err);
            return res.status(500).json({ error: 'Error al obtener los productos' });
        }
        const productos = rows.map(producto => ({
            ...producto,
            disponible: Boolean(producto.disponible)
        }));
        res.json(productos);
    });
});
// Obtener productos por categoría
router.get('/categoria/:categoria', (req, res) => {
    const { categoria } = req.params;
    const query = 'SELECT * FROM productos WHERE categoria = ? AND disponible = 1 ORDER BY nombre';
    init_1.db.all(query, [categoria], (err, rows) => {
        if (err) {
            console.error('Error al obtener productos por categoría:', err);
            return res.status(500).json({ error: 'Error al obtener los productos' });
        }
        const productos = rows.map(producto => ({
            ...producto,
            disponible: Boolean(producto.disponible)
        }));
        res.json(productos);
    });
});
// Obtener un producto específico
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM productos WHERE id = ?';
    init_1.db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Error al obtener producto:', err);
            return res.status(500).json({ error: 'Error al obtener el producto' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        const producto = {
            ...row,
            disponible: Boolean(row.disponible)
        };
        res.json(producto);
    });
});
// Crear nuevo producto
router.post('/', (req, res) => {
    const { nombre, descripcion, precio, categoria, disponible = true } = req.body;
    if (!nombre || !precio || !categoria) {
        return res.status(400).json({
            error: 'Nombre, precio y categoría son requeridos'
        });
    }
    const query = `
    INSERT INTO productos (nombre, descripcion, precio, categoria, disponible) 
    VALUES (?, ?, ?, ?, ?)
  `;
    init_1.db.run(query, [nombre, descripcion, precio, categoria, disponible ? 1 : 0], function (err) {
        if (err) {
            console.error('Error al crear producto:', err);
            return res.status(500).json({ error: 'Error al crear el producto' });
        }
        // Obtener el producto creado
        init_1.db.get('SELECT * FROM productos WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                console.error('Error al obtener producto creado:', err);
                return res.status(500).json({ error: 'Error al obtener el producto creado' });
            }
            const producto = {
                ...row,
                disponible: Boolean(row.disponible)
            };
            res.status(201).json(producto);
        });
    });
});
// Actualizar producto
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria, disponible } = req.body;
    if (!nombre || !precio || !categoria) {
        return res.status(400).json({
            error: 'Nombre, precio y categoría son requeridos'
        });
    }
    const query = `
    UPDATE productos 
    SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, disponible = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
    init_1.db.run(query, [nombre, descripcion, precio, categoria, disponible ? 1 : 0, id], function (err) {
        if (err) {
            console.error('Error al actualizar producto:', err);
            return res.status(500).json({ error: 'Error al actualizar el producto' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        // Obtener el producto actualizado
        init_1.db.get('SELECT * FROM productos WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Error al obtener producto actualizado:', err);
                return res.status(500).json({ error: 'Error al obtener el producto actualizado' });
            }
            const producto = {
                ...row,
                disponible: Boolean(row.disponible)
            };
            res.json(producto);
        });
    });
});
// Cambiar disponibilidad de producto
router.patch('/:id/disponibilidad', (req, res) => {
    const { id } = req.params;
    const { disponible } = req.body;
    if (typeof disponible !== 'boolean') {
        return res.status(400).json({ error: 'El campo disponible debe ser un boolean' });
    }
    const query = 'UPDATE productos SET disponible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    init_1.db.run(query, [disponible ? 1 : 0, id], function (err) {
        if (err) {
            console.error('Error al actualizar disponibilidad:', err);
            return res.status(500).json({ error: 'Error al actualizar la disponibilidad' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        // Obtener el producto actualizado
        init_1.db.get('SELECT * FROM productos WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Error al obtener producto actualizado:', err);
                return res.status(500).json({ error: 'Error al obtener el producto actualizado' });
            }
            const producto = {
                ...row,
                disponible: Boolean(row.disponible)
            };
            res.json(producto);
        });
    });
});
exports.default = router;
//# sourceMappingURL=productos.js.map