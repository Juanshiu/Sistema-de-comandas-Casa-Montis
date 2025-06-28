"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const init_1 = require("../database/init");
const router = (0, express_1.Router)();
// Reporte de ventas por día
router.get('/ventas', (req, res) => {
    const { fecha } = req.query;
    const fechaBusqueda = fecha || new Date().toISOString().split('T')[0];
    // Obtener totales del día
    const totalesQuery = `
    SELECT 
      COUNT(*) as cantidad_comandas,
      COALESCE(SUM(total), 0) as total_ventas
    FROM facturas 
    WHERE DATE(fecha_creacion) = ?
  `;
    init_1.db.get(totalesQuery, [fechaBusqueda], (err, totales) => {
        if (err) {
            console.error('Error al obtener totales:', err);
            return res.status(500).json({ error: 'Error al obtener los totales de ventas' });
        }
        // Obtener productos más vendidos
        const productosQuery = `
      SELECT 
        p.id,
        p.nombre,
        p.descripcion,
        p.categoria,
        p.precio,
        SUM(ci.cantidad) as cantidad_vendida,
        SUM(ci.subtotal) as total_vendido
      FROM comanda_items ci
      JOIN productos p ON ci.producto_id = p.id
      JOIN comandas c ON ci.comanda_id = c.id
      JOIN facturas f ON c.id = f.comanda_id
      WHERE DATE(f.fecha_creacion) = ?
      GROUP BY p.id, p.nombre, p.descripcion, p.categoria, p.precio
      ORDER BY cantidad_vendida DESC
      LIMIT 20
    `;
        init_1.db.all(productosQuery, [fechaBusqueda], (err, productosRows) => {
            if (err) {
                console.error('Error al obtener productos:', err);
                return res.status(500).json({ error: 'Error al obtener productos más vendidos' });
            }
            const productos_mas_vendidos = productosRows.map(row => ({
                producto: {
                    id: row.id,
                    nombre: row.nombre,
                    descripcion: row.descripcion,
                    categoria: row.categoria,
                    precio: row.precio,
                    disponible: true
                },
                cantidad_vendida: row.cantidad_vendida,
                total_vendido: row.total_vendido
            }));
            // Obtener ventas por hora
            const ventasHoraQuery = `
        SELECT 
          CAST(strftime('%H', fecha_creacion) AS INTEGER) as hora,
          COUNT(*) as comandas,
          COALESCE(SUM(total), 0) as ventas
        FROM facturas 
        WHERE DATE(fecha_creacion) = ?
        GROUP BY CAST(strftime('%H', fecha_creacion) AS INTEGER)
        ORDER BY hora
      `;
            init_1.db.all(ventasHoraQuery, [fechaBusqueda], (err, ventasRows) => {
                if (err) {
                    console.error('Error al obtener ventas por hora:', err);
                    return res.status(500).json({ error: 'Error al obtener ventas por hora' });
                }
                const ventas_por_hora = ventasRows.map(row => ({
                    hora: row.hora.toString(),
                    comandas: row.comandas,
                    ventas: row.ventas
                }));
                const reporte = {
                    fecha: fechaBusqueda,
                    total_ventas: totales.total_ventas,
                    cantidad_comandas: totales.cantidad_comandas,
                    productos_mas_vendidos,
                    ventas_por_hora
                };
                res.json(reporte);
            });
        });
    });
});
// Reporte de ventas por rango de fechas
router.get('/ventas/rango', (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || !fechaFin) {
        return res.status(400).json({
            error: 'Se requieren fechaInicio y fechaFin'
        });
    }
    const query = `
    SELECT 
      DATE(fecha_creacion) as fecha,
      COUNT(*) as cantidad_comandas,
      COALESCE(SUM(total), 0) as total_ventas
    FROM facturas 
    WHERE DATE(fecha_creacion) BETWEEN ? AND ?
    GROUP BY DATE(fecha_creacion)
    ORDER BY fecha
  `;
    init_1.db.all(query, [fechaInicio, fechaFin], (err, rows) => {
        if (err) {
            console.error('Error al obtener reporte por rango:', err);
            return res.status(500).json({ error: 'Error al obtener el reporte por rango' });
        }
        const reportes = rows.map(row => ({
            fecha: row.fecha,
            total_ventas: row.total_ventas,
            cantidad_comandas: row.cantidad_comandas,
            productos_mas_vendidos: [], // Se puede expandir si se necesita
            ventas_por_hora: [] // Se puede expandir si se necesita
        }));
        res.json(reportes);
    });
});
// Reporte de productos más vendidos por categoría
router.get('/productos/categoria/:categoria', (req, res) => {
    const { categoria } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    let whereClause = 'WHERE p.categoria = ?';
    let params = [categoria];
    if (fechaInicio && fechaFin) {
        whereClause += ' AND DATE(f.fecha_creacion) BETWEEN ? AND ?';
        params.push(fechaInicio, fechaFin);
    }
    const query = `
    SELECT 
      p.id,
      p.nombre,
      p.descripcion,
      p.categoria,
      p.precio,
      SUM(ci.cantidad) as cantidad_vendida,
      SUM(ci.subtotal) as total_vendido,
      COUNT(DISTINCT f.id) as facturas_con_producto
    FROM comanda_items ci
    JOIN productos p ON ci.producto_id = p.id
    JOIN comandas c ON ci.comanda_id = c.id
    JOIN facturas f ON c.id = f.comanda_id
    ${whereClause}
    GROUP BY p.id, p.nombre, p.descripcion, p.categoria, p.precio
    ORDER BY cantidad_vendida DESC
  `;
    init_1.db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error al obtener productos por categoría:', err);
            return res.status(500).json({ error: 'Error al obtener productos por categoría' });
        }
        const productos = rows.map(row => ({
            producto: {
                id: row.id,
                nombre: row.nombre,
                descripcion: row.descripcion,
                categoria: row.categoria,
                precio: row.precio,
                disponible: true
            },
            cantidad_vendida: row.cantidad_vendida,
            total_vendido: row.total_vendido,
            facturas_con_producto: row.facturas_con_producto
        }));
        res.json(productos);
    });
});
// Reporte de personalizaciones más populares
router.get('/personalizaciones', (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    let whereClause = 'WHERE ci.personalizacion IS NOT NULL';
    let params = [];
    if (fechaInicio && fechaFin) {
        whereClause += ' AND DATE(f.fecha_creacion) BETWEEN ? AND ?';
        params.push(fechaInicio, fechaFin);
    }
    const query = `
    SELECT 
      ci.personalizacion,
      COUNT(*) as frecuencia,
      p.categoria
    FROM comanda_items ci
    JOIN productos p ON ci.producto_id = p.id
    JOIN comandas c ON ci.comanda_id = c.id
    JOIN facturas f ON c.id = f.comanda_id
    ${whereClause}
    GROUP BY ci.personalizacion, p.categoria
    ORDER BY frecuencia DESC
    LIMIT 50
  `;
    init_1.db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error al obtener personalizaciones:', err);
            return res.status(500).json({ error: 'Error al obtener personalizaciones más populares' });
        }
        // Procesar personalizaciones
        const personalizaciones = {
            caldos: {},
            proteinas: {},
            bebidas: {},
            principios: {}
        };
        rows.forEach(row => {
            try {
                const personalizacion = JSON.parse(row.personalizacion);
                if (personalizacion.caldo) {
                    const nombre = personalizacion.caldo.nombre;
                    personalizaciones.caldos[nombre] = (personalizaciones.caldos[nombre] || 0) + row.frecuencia;
                }
                if (personalizacion.proteina) {
                    const nombre = personalizacion.proteina.nombre;
                    personalizaciones.proteinas[nombre] = (personalizaciones.proteinas[nombre] || 0) + row.frecuencia;
                }
                if (personalizacion.bebida) {
                    const nombre = personalizacion.bebida.nombre;
                    personalizaciones.bebidas[nombre] = (personalizaciones.bebidas[nombre] || 0) + row.frecuencia;
                }
                if (personalizacion.principio) {
                    const nombre = personalizacion.principio.nombre;
                    personalizaciones.principios[nombre] = (personalizaciones.principios[nombre] || 0) + row.frecuencia;
                }
            }
            catch (e) {
                console.warn('Error parsing personalization:', row.personalizacion);
            }
        });
        // Convertir a arrays ordenados
        const resultado = {
            caldos_mas_pedidos: Object.entries(personalizaciones.caldos)
                .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
                .sort((a, b) => b.frecuencia - a.frecuencia),
            proteinas_mas_pedidas: Object.entries(personalizaciones.proteinas)
                .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
                .sort((a, b) => b.frecuencia - a.frecuencia),
            bebidas_mas_pedidas: Object.entries(personalizaciones.bebidas)
                .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
                .sort((a, b) => b.frecuencia - a.frecuencia),
            principios_mas_pedidos: Object.entries(personalizaciones.principios)
                .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
                .sort((a, b) => b.frecuencia - a.frecuencia)
        };
        res.json(resultado);
    });
});
exports.default = router;
//# sourceMappingURL=reportes.js.map