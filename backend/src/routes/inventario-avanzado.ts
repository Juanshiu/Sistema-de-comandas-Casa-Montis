import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import * as XLSX from 'xlsx';

const router = Router();

const UNIDADES_VALIDAS = ['g', 'kg', 'ml', 'unidad'];

const calcularEstadoInsumo = (stockActual: number, stockMinimo: number, stockCritico: number) => {
  if (stockActual <= stockCritico) return 'CRITICO';
  if (stockActual <= stockMinimo) return 'BAJO';
  return 'OK';
};

const combinarEstadoRiesgo = (estadoActual: string | null, nuevoEstado: string) => {
  if (estadoActual === 'CRITICO' || nuevoEstado === 'CRITICO') return 'CRITICO';
  if (estadoActual === 'BAJO' || nuevoEstado === 'BAJO') return 'BAJO';
  return 'OK';
};

const runAsync = (sql: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

const getAsync = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
};

const allAsync = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
};

const normalizarNumero = (valor: any) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const num = Number(valor);
  return Number.isNaN(num) ? null : num;
};

const registrarHistorialInsumo = async (data: {
  insumo_id: number;
  cantidad: number;
  unidad_medida: string;
  producto_id?: number | null;
  comanda_id?: string | null;
  tipo_evento: string;
  motivo?: string | null;
  usuario_id?: number | null;
  proveedor_id?: number | null;
}) => {
  await runAsync(
    `INSERT INTO insumo_historial (insumo_id, cantidad, unidad_medida, producto_id, comanda_id, tipo_evento, motivo, usuario_id, proveedor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [
      data.insumo_id,
      data.cantidad,
      data.unidad_medida,
      data.producto_id ?? null,
      data.comanda_id ?? null,
      data.tipo_evento,
      data.motivo ?? null,
      data.usuario_id ?? null,
      data.proveedor_id ?? null
    ]
  );
};

const validarInsumo = (data: any) => {
  const errores: string[] = [];

  if (!data.nombre || !String(data.nombre).trim()) {
    errores.push('El nombre es obligatorio');
  }

  if (!data.unidad_medida || !UNIDADES_VALIDAS.includes(String(data.unidad_medida))) {
    errores.push(`Unidad de medida inválida. Use: ${UNIDADES_VALIDAS.join(', ')}`);
  }

  const stockActual = normalizarNumero(data.stock_actual);
  const stockMinimo = normalizarNumero(data.stock_minimo);
  const stockCritico = normalizarNumero(data.stock_critico);

  if (stockActual === null || stockActual < 0) {
    errores.push('stock_actual debe ser un número mayor o igual a 0');
  }
  if (stockMinimo === null || stockMinimo < 0) {
    errores.push('stock_minimo debe ser un número mayor o igual a 0');
  }
  if (stockCritico === null || stockCritico < 0) {
    errores.push('stock_critico debe ser un número mayor o igual a 0');
  }
  if (stockMinimo !== null && stockCritico !== null && stockCritico > stockMinimo) {
    errores.push('stock_critico no puede ser mayor que stock_minimo');
  }

  return { errores, stockActual, stockMinimo, stockCritico };
};

// ===================== INSUMOS =====================

router.get('/insumos', (req: Request, res: Response) => {
  const query = `
    SELECT i.*, ic.nombre as categoria_nombre 
    FROM insumos i 
    LEFT JOIN insumo_categorias ic ON i.categoria_id = ic.id 
    WHERE i.activo = 1 
    ORDER BY i.nombre
  `;
  db.all(query, [], (err, rows: any[]) => {
    if (err) {
      console.error('Error al obtener insumos:', err);
      return res.status(500).json({ error: 'Error al obtener insumos' });
    }

    const insumos = rows.map(row => ({
      ...row,
      activo: row.activo === 1,
      estado: calcularEstadoInsumo(row.stock_actual, row.stock_minimo, row.stock_critico)
    }));

    res.json(insumos);
  });
});

router.post('/insumos', async (req: Request, res: Response) => {
  const { nombre, unidad_medida, stock_actual, stock_minimo, stock_critico, costo_unitario, categoria_id } = req.body;
  const validacion = validarInsumo({ nombre, unidad_medida, stock_actual, stock_minimo, stock_critico });

  if (validacion.errores.length > 0) {
    return res.status(400).json({ error: validacion.errores.join(' | ') });
  }

  try {
    await runAsync(
      `INSERT INTO insumos (nombre, unidad_medida, stock_actual, stock_minimo, stock_critico, costo_unitario, categoria_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        unidad_medida,
        validacion.stockActual,
        validacion.stockMinimo,
        validacion.stockCritico,
        normalizarNumero(costo_unitario),
        categoria_id || null
      ]
    );

    const creado = await getAsync('SELECT * FROM insumos WHERE id = (SELECT last_insert_rowid())');
    res.status(201).json({
      ...creado,
      activo: creado.activo === 1,
      estado: calcularEstadoInsumo(creado.stock_actual, creado.stock_minimo, creado.stock_critico)
    });
  } catch (error: any) {
    console.error('Error al crear insumo:', error);
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe un insumo con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear insumo' });
  }
});

router.put('/insumos/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, unidad_medida, stock_actual, stock_minimo, stock_critico, costo_unitario, categoria_id, activo } = req.body;
  const validacion = validarInsumo({ nombre, unidad_medida, stock_actual, stock_minimo, stock_critico });

  if (validacion.errores.length > 0) {
    return res.status(400).json({ error: validacion.errores.join(' | ') });
  }

  try {
    await runAsync(
      `UPDATE insumos
       SET nombre = ?, unidad_medida = ?, stock_actual = ?, stock_minimo = ?, stock_critico = ?, costo_unitario = ?, categoria_id = ?, activo = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nombre.trim(),
        unidad_medida,
        validacion.stockActual,
        validacion.stockMinimo,
        validacion.stockCritico,
        normalizarNumero(costo_unitario),
        categoria_id || null,
        activo === undefined ? 1 : (activo ? 1 : 0),
        id
      ]
    );

    const actualizado = await getAsync('SELECT * FROM insumos WHERE id = ?', [id]);
    if (!actualizado) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    res.json({
      ...actualizado,
      activo: actualizado.activo === 1,
      estado: calcularEstadoInsumo(actualizado.stock_actual, actualizado.stock_minimo, actualizado.stock_critico)
    });
  } catch (error: any) {
    console.error('Error al actualizar insumo:', error);
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Ya existe un insumo con ese nombre' });
    }
    res.status(500).json({ error: 'Error al actualizar insumo' });
  }
});

router.delete('/insumos/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const usosProducto = await getAsync('SELECT COUNT(*) as count FROM producto_insumos WHERE insumo_id = ?', [id]);
    const usosPersonalizacion = await getAsync('SELECT COUNT(*) as count FROM personalizacion_insumos WHERE insumo_id = ?', [id]);

    if ((usosProducto?.count || 0) > 0 || (usosPersonalizacion?.count || 0) > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el insumo porque está asociado a recetas' });
    }

    await runAsync('DELETE FROM insumos WHERE id = ?', [id]);
    res.json({ mensaje: 'Insumo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar insumo:', error);
    res.status(500).json({ error: 'Error al eliminar insumo' });
  }
});

// Ajuste manual de stock
router.post('/insumos/:id/ajuste', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cantidad, motivo, usuario_id, proveedor_id } = req.body;

  const cantidadNum = Number(cantidad);
  if (Number.isNaN(cantidadNum) || cantidadNum === 0) {
    return res.status(400).json({ error: 'cantidad debe ser un número diferente de 0' });
  }

  try {
    const insumo = await getAsync('SELECT * FROM insumos WHERE id = ?', [id]);
    if (!insumo) {
      return res.status(404).json({ error: 'Insumo no encontrado' });
    }

    const stockActual = Number(insumo.stock_actual) || 0;
    const nuevoStock = stockActual + cantidadNum;
    if (nuevoStock < 0) {
      return res.status(400).json({ error: 'El ajuste deja el stock en negativo' });
    }

    await runAsync(
      'UPDATE insumos SET stock_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nuevoStock, id]
    );

    await registrarHistorialInsumo({
      insumo_id: Number(id),
      cantidad: cantidadNum,
      unidad_medida: insumo.unidad_medida,
      tipo_evento: 'AJUSTE',
      motivo: motivo ? String(motivo) : 'Ajuste manual',
      usuario_id: usuario_id ? Number(usuario_id) : null,
      proveedor_id: proveedor_id ? Number(proveedor_id) : null
    });

    const actualizado = await getAsync('SELECT * FROM insumos WHERE id = ?', [id]);
    res.json({
      ...actualizado,
      activo: actualizado.activo === 1,
      estado: calcularEstadoInsumo(actualizado.stock_actual, actualizado.stock_minimo, actualizado.stock_critico)
    });
  } catch (error) {
    console.error('Error al ajustar insumo:', error);
    res.status(500).json({ error: 'Error al ajustar el insumo' });
  }
});

// Historial de movimientos
router.get('/insumos/historial', async (req: Request, res: Response) => {
  const { insumo_id, limit, fecha_inicio, fecha_fin } = req.query;
  const limitNum = Math.min(Math.max(Number(limit) || 100, 1), 500);

  try {
    const params: any[] = [];
    let where = 'WHERE 1=1';
    
    if (insumo_id) {
      where += ' AND h.insumo_id = ?';
      params.push(Number(insumo_id));
    }

    if (fecha_inicio) {
      where += ' AND DATE(h.fecha_hora) >= DATE(?)';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      where += ' AND DATE(h.fecha_hora) <= DATE(?)';
      params.push(fecha_fin);
    }

    const rows = await allAsync(
      `SELECT h.*, i.nombre as insumo_nombre, p.nombre as producto_nombre, prov.nombre as proveedor_nombre
       FROM insumo_historial h
       JOIN insumos i ON h.insumo_id = i.id
       LEFT JOIN productos p ON h.producto_id = p.id
       LEFT JOIN proveedores prov ON h.proveedor_id = prov.id
       ${where}
       ORDER BY h.fecha_hora DESC
       LIMIT ?`,
      [...params, limitNum]
    );

    res.json(rows || []);
  } catch (error) {
    console.error('Error al obtener historial de insumos:', error);
    res.status(500).json({ error: 'Error al obtener historial de insumos' });
  }
});

// Limpiar historial antiguo
router.delete('/historial/limpiar', async (req: Request, res: Response) => {
  const { dias } = req.body;
  const diasNum = Number(dias);

  if (isNaN(diasNum) || diasNum < 0) {
    return res.status(400).json({ error: 'Días inválidos' });
  }

  try {
    const query = `
      DELETE FROM insumo_historial 
      WHERE datetime(fecha_hora) < datetime('now', '-' || ? || ' days')
    `;
    
    // Obtener cuántos se van a borrar (opcional para informar)
    const countResult = await getAsync(
      `SELECT COUNT(*) as count FROM insumo_historial WHERE datetime(fecha_hora) < datetime('now', '-' || ? || ' days')`,
      [diasNum]
    );

    await runAsync(query, [diasNum]);

    res.json({ 
      message: `Se han eliminado ${countResult.count} registros del historial de más de ${diasNum} días.`,
      deletedCount: countResult.count 
    });
  } catch (error) {
    console.error('Error al limpiar historial:', error);
    res.status(500).json({ error: 'Error al limpiar historial' });
  }
});

// Riesgo por insumos en productos
router.get('/riesgo/productos', async (req: Request, res: Response) => {
  try {
    const rows = await allAsync(
      `SELECT pi.producto_id, i.stock_actual, i.stock_minimo, i.stock_critico
       FROM producto_insumos pi
       JOIN insumos i ON pi.insumo_id = i.id
       JOIN productos p ON pi.producto_id = p.id
       WHERE i.activo = 1 AND p.usa_insumos = 1`
    );

    const riesgos = new Map<number, string>();
    rows.forEach(row => {
      const estado = calcularEstadoInsumo(row.stock_actual, row.stock_minimo, row.stock_critico);
      const actual = riesgos.get(row.producto_id) || null;
      riesgos.set(row.producto_id, combinarEstadoRiesgo(actual, estado));
    });

    const respuesta = Array.from(riesgos.entries()).map(([producto_id, estado]) => ({ producto_id, estado }));
    res.json(respuesta);
  } catch (error) {
    console.error('Error al calcular riesgo de productos:', error);
    res.status(500).json({ error: 'Error al calcular riesgo de productos' });
  }
});

// Riesgo por insumos en personalizaciones
router.get('/riesgo/personalizaciones', async (req: Request, res: Response) => {
  try {
    const rows = await allAsync(
      `SELECT pi.item_personalizacion_id, i.stock_actual, i.stock_minimo, i.stock_critico
       FROM personalizacion_insumos pi
       JOIN insumos i ON pi.insumo_id = i.id
       JOIN items_personalizacion ip ON pi.item_personalizacion_id = ip.id
       WHERE i.activo = 1 AND ip.usa_insumos = 1`
    );

    const riesgos = new Map<number, string>();
    rows.forEach(row => {
      const estado = calcularEstadoInsumo(row.stock_actual, row.stock_minimo, row.stock_critico);
      const actual = riesgos.get(row.item_personalizacion_id) || null;
      riesgos.set(row.item_personalizacion_id, combinarEstadoRiesgo(actual, estado));
    });

    const respuesta = Array.from(riesgos.entries()).map(([item_personalizacion_id, estado]) => ({ item_personalizacion_id, estado }));
    res.json(respuesta);
  } catch (error) {
    console.error('Error al calcular riesgo de personalizaciones:', error);
    res.status(500).json({ error: 'Error al calcular riesgo de personalizaciones' });
  }
});

// ===================== RECETAS PRODUCTOS =====================

router.get('/recetas/productos/:productoId', (req: Request, res: Response) => {
  const { productoId } = req.params;

  const query = `
    SELECT pi.*, i.nombre as insumo_nombre, i.unidad_medida
    FROM producto_insumos pi
    JOIN insumos i ON pi.insumo_id = i.id
    WHERE pi.producto_id = ?
    ORDER BY i.nombre
  `;

  db.all(query, [productoId], (err, rows: any[]) => {
    if (err) {
      console.error('Error al obtener receta:', err);
      return res.status(500).json({ error: 'Error al obtener receta del producto' });
    }

    res.json(rows || []);
  });
});

router.put('/recetas/productos/:productoId', async (req: Request, res: Response) => {
  const { productoId } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items debe ser un array' });
  }

  const errores: string[] = [];
  const recetas: { insumo_id: number; cantidad_usada: number }[] = [];

  items.forEach((item: any, index: number) => {
    const insumoId = Number(item.insumo_id);
    const cantidad = Number(item.cantidad_usada);

    if (!insumoId || Number.isNaN(insumoId)) {
      errores.push(`Fila ${index + 1}: insumo_id inválido`);
    }
    if (!cantidad || Number.isNaN(cantidad) || cantidad <= 0) {
      errores.push(`Fila ${index + 1}: cantidad_usada debe ser mayor a 0`);
    }

    if (!Number.isNaN(insumoId) && !Number.isNaN(cantidad) && cantidad > 0) {
      recetas.push({ insumo_id: insumoId, cantidad_usada: cantidad });
    }
  });

  if (errores.length > 0) {
    return res.status(400).json({ error: errores.join(' | ') });
  }

  try {
    await runAsync('BEGIN TRANSACTION');
    await runAsync('DELETE FROM producto_insumos WHERE producto_id = ?', [productoId]);

    for (const receta of recetas) {
      await runAsync(
        'INSERT INTO producto_insumos (producto_id, insumo_id, cantidad_usada) VALUES (?, ?, ?)',
        [productoId, receta.insumo_id, receta.cantidad_usada]
      );
    }

    await runAsync('COMMIT');
    res.json({ mensaje: 'Receta actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar receta:', error);
    try {
      await runAsync('ROLLBACK');
    } catch {
      // noop
    }
    res.status(500).json({ error: 'Error al actualizar receta del producto' });
  }
});

// ===================== AJUSTES PERSONALIZACIONES =====================

router.get('/recetas/personalizaciones/:itemId', (req: Request, res: Response) => {
  const { itemId } = req.params;

  const query = `
    SELECT pi.*, i.nombre as insumo_nombre, i.unidad_medida
    FROM personalizacion_insumos pi
    JOIN insumos i ON pi.insumo_id = i.id
    WHERE pi.item_personalizacion_id = ?
    ORDER BY i.nombre
  `;

  db.all(query, [itemId], (err, rows: any[]) => {
    if (err) {
      console.error('Error al obtener ajustes:', err);
      return res.status(500).json({ error: 'Error al obtener ajustes de personalización' });
    }

    res.json(rows || []);
  });
});

router.put('/recetas/personalizaciones/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items debe ser un array' });
  }

  const errores: string[] = [];
  const ajustes: { insumo_id: number; cantidad_ajuste: number }[] = [];

  items.forEach((item: any, index: number) => {
    const insumoId = Number(item.insumo_id);
    const cantidad = Number(item.cantidad_ajuste);

    if (!insumoId || Number.isNaN(insumoId)) {
      errores.push(`Fila ${index + 1}: insumo_id inválido`);
    }
    if (!cantidad || Number.isNaN(cantidad) || cantidad === 0) {
      errores.push(`Fila ${index + 1}: cantidad_ajuste debe ser diferente de 0`);
    }

    if (!Number.isNaN(insumoId) && !Number.isNaN(cantidad) && cantidad !== 0) {
      ajustes.push({ insumo_id: insumoId, cantidad_ajuste: cantidad });
    }
  });

  if (errores.length > 0) {
    return res.status(400).json({ error: errores.join(' | ') });
  }

  try {
    await runAsync('BEGIN TRANSACTION');
    await runAsync('DELETE FROM personalizacion_insumos WHERE item_personalizacion_id = ?', [itemId]);

    for (const ajuste of ajustes) {
      await runAsync(
        'INSERT INTO personalizacion_insumos (item_personalizacion_id, insumo_id, cantidad_ajuste) VALUES (?, ?, ?)',
        [itemId, ajuste.insumo_id, ajuste.cantidad_ajuste]
      );
    }

    await runAsync('COMMIT');
    res.json({ mensaje: 'Ajustes actualizados exitosamente' });
  } catch (error) {
    console.error('Error al actualizar ajustes:', error);
    try {
      await runAsync('ROLLBACK');
    } catch {
      // noop
    }
    res.status(500).json({ error: 'Error al actualizar ajustes de personalización' });
  }
});

// ===================== IMPORT / EXPORT =====================

router.get('/insumos/export', async (req: Request, res: Response) => {
  try {
    const insumos = await allAsync('SELECT * FROM insumos ORDER BY nombre');
    const data = insumos.map(i => ({
      id: i.id,
      nombre: i.nombre,
      unidad_medida: i.unidad_medida,
      stock_actual: i.stock_actual,
      stock_minimo: i.stock_minimo,
      stock_critico: i.stock_critico,
      costo_unitario: i.costo_unitario
    }));

    const worksheet = XLSX.utils.json_to_sheet(data, { header: ['id', 'nombre', 'unidad_medida', 'stock_actual', 'stock_minimo', 'stock_critico', 'costo_unitario'] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Insumos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="insumos.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar insumos:', error);
    res.status(500).json({ error: 'Error al exportar insumos' });
  }
});

router.post('/insumos/import', async (req: Request, res: Response) => {
  const { fileBase64 } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ error: 'fileBase64 es requerido' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'El archivo no contiene datos' });
    }

    const errores: string[] = [];
    const datosProcesados: any[] = [];

    rows.forEach((row, index) => {
      const validacion = validarInsumo({
        nombre: row.nombre,
        unidad_medida: row.unidad_medida,
        stock_actual: row.stock_actual,
        stock_minimo: row.stock_minimo,
        stock_critico: row.stock_critico
      });

      if (validacion.errores.length > 0) {
        errores.push(`Fila ${index + 2}: ${validacion.errores.join(', ')}`);
        return;
      }

      datosProcesados.push({
        nombre: String(row.nombre).trim(),
        unidad_medida: String(row.unidad_medida).trim(),
        stock_actual: validacion.stockActual,
        stock_minimo: validacion.stockMinimo,
        stock_critico: validacion.stockCritico,
        costo_unitario: normalizarNumero(row.costo_unitario)
      });
    });

    if (errores.length > 0) {
      return res.status(400).json({ error: errores.join(' | ') });
    }

    await runAsync('BEGIN TRANSACTION');

    for (const insumo of datosProcesados) {
      const existente = await getAsync('SELECT id FROM insumos WHERE nombre = ?', [insumo.nombre]);
      if (existente) {
        await runAsync(
          `UPDATE insumos
           SET unidad_medida = ?, stock_actual = ?, stock_minimo = ?, stock_critico = ?, costo_unitario = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            insumo.unidad_medida,
            insumo.stock_actual,
            insumo.stock_minimo,
            insumo.stock_critico,
            insumo.costo_unitario,
            existente.id
          ]
        );
      } else {
        await runAsync(
          `INSERT INTO insumos (nombre, unidad_medida, stock_actual, stock_minimo, stock_critico, costo_unitario)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            insumo.nombre,
            insumo.unidad_medida,
            insumo.stock_actual,
            insumo.stock_minimo,
            insumo.stock_critico,
            insumo.costo_unitario
          ]
        );
      }
    }

    await runAsync('COMMIT');
    res.json({ mensaje: 'Insumos importados exitosamente', total: datosProcesados.length });
  } catch (error) {
    console.error('Error al importar insumos:', error);
    try {
      await runAsync('ROLLBACK');
    } catch {
      // noop
    }
    res.status(500).json({ error: 'Error al importar insumos' });
  }
});

router.get('/recetas/export', async (req: Request, res: Response) => {
  try {
    const recetas = await allAsync(`
      SELECT pi.producto_id, p.nombre as producto_nombre, pi.insumo_id, i.nombre as insumo_nombre, pi.cantidad_usada
      FROM producto_insumos pi
      JOIN productos p ON pi.producto_id = p.id
      JOIN insumos i ON pi.insumo_id = i.id
      ORDER BY p.nombre, i.nombre
    `);

    const ajustes = await allAsync(`
      SELECT pi.item_personalizacion_id, ip.nombre as item_nombre, ip.categoria_id, pi.insumo_id, i.nombre as insumo_nombre, pi.cantidad_ajuste
      FROM personalizacion_insumos pi
      JOIN items_personalizacion ip ON pi.item_personalizacion_id = ip.id
      JOIN insumos i ON pi.insumo_id = i.id
      ORDER BY ip.nombre, i.nombre
    `);

    const recetasSheet = XLSX.utils.json_to_sheet(recetas, {
      header: ['producto_id', 'producto_nombre', 'insumo_id', 'insumo_nombre', 'cantidad_usada']
    });
    const ajustesSheet = XLSX.utils.json_to_sheet(ajustes, {
      header: ['item_personalizacion_id', 'item_nombre', 'categoria_id', 'insumo_id', 'insumo_nombre', 'cantidad_ajuste']
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, recetasSheet, 'RecetasProductos');
    XLSX.utils.book_append_sheet(workbook, ajustesSheet, 'AjustesPersonalizaciones');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="recetas.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar recetas:', error);
    res.status(500).json({ error: 'Error al exportar recetas' });
  }
});

router.post('/recetas/import', async (req: Request, res: Response) => {
  const { fileBase64 } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ error: 'fileBase64 es requerido' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const recetasSheet = workbook.Sheets['RecetasProductos'];
    const ajustesSheet = workbook.Sheets['AjustesPersonalizaciones'];

    const recetasRows: any[] = recetasSheet ? XLSX.utils.sheet_to_json(recetasSheet, { defval: null }) : [];
    const ajustesRows: any[] = ajustesSheet ? XLSX.utils.sheet_to_json(ajustesSheet, { defval: null }) : [];

    const errores: string[] = [];
    const recetasPorProducto = new Map<number, { insumo_id: number; cantidad_usada: number }[]>();
    const ajustesPorItem = new Map<number, { insumo_id: number; cantidad_ajuste: number }[]>();

    for (const [index, row] of recetasRows.entries()) {
      const productoId = normalizarNumero(row.producto_id);
      const insumoId = normalizarNumero(row.insumo_id);
      const cantidad = normalizarNumero(row.cantidad_usada);

      if (!productoId || !insumoId || !cantidad || cantidad <= 0) {
        errores.push(`RecetasProductos fila ${index + 2}: producto_id, insumo_id y cantidad_usada son obligatorios`);
        continue;
      }

      if (!recetasPorProducto.has(productoId)) {
        recetasPorProducto.set(productoId, []);
      }

      recetasPorProducto.get(productoId)!.push({ insumo_id: insumoId, cantidad_usada: cantidad });
    }

    for (const [index, row] of ajustesRows.entries()) {
      const itemId = normalizarNumero(row.item_personalizacion_id);
      const insumoId = normalizarNumero(row.insumo_id);
      const cantidad = normalizarNumero(row.cantidad_ajuste);

      if (!itemId || !insumoId || !cantidad || cantidad === 0) {
        errores.push(`AjustesPersonalizaciones fila ${index + 2}: item_personalizacion_id, insumo_id y cantidad_ajuste son obligatorios`);
        continue;
      }

      if (!ajustesPorItem.has(itemId)) {
        ajustesPorItem.set(itemId, []);
      }

      ajustesPorItem.get(itemId)!.push({ insumo_id: insumoId, cantidad_ajuste: cantidad });
    }

    if (errores.length > 0) {
      return res.status(400).json({ error: errores.join(' | ') });
    }

    await runAsync('BEGIN TRANSACTION');

    for (const [productoId, recetas] of recetasPorProducto.entries()) {
      await runAsync('DELETE FROM producto_insumos WHERE producto_id = ?', [productoId]);
      for (const receta of recetas) {
        await runAsync(
          'INSERT INTO producto_insumos (producto_id, insumo_id, cantidad_usada) VALUES (?, ?, ?)',
          [productoId, receta.insumo_id, receta.cantidad_usada]
        );
      }
    }

    for (const [itemId, ajustes] of ajustesPorItem.entries()) {
      await runAsync('DELETE FROM personalizacion_insumos WHERE item_personalizacion_id = ?', [itemId]);
      for (const ajuste of ajustes) {
        await runAsync(
          'INSERT INTO personalizacion_insumos (item_personalizacion_id, insumo_id, cantidad_ajuste) VALUES (?, ?, ?)',
          [itemId, ajuste.insumo_id, ajuste.cantidad_ajuste]
        );
      }
    }

    await runAsync('COMMIT');

    res.json({
      mensaje: 'Recetas importadas exitosamente',
      productos_actualizados: recetasPorProducto.size,
      personalizaciones_actualizadas: ajustesPorItem.size
    });
  } catch (error) {
    console.error('Error al importar recetas:', error);
    try {
      await runAsync('ROLLBACK');
    } catch {
      // noop
    }
    res.status(500).json({ error: 'Error al importar recetas' });
  }
});

router.get('/productos/export', async (req: Request, res: Response) => {
  try {
    const productos = await allAsync('SELECT * FROM productos ORDER BY categoria, nombre');
    const data = productos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      categoria: p.categoria,
      disponible: p.disponible,
      tiene_personalizacion: p.tiene_personalizacion,
      personalizaciones_habilitadas: p.personalizaciones_habilitadas,
      usa_inventario: p.usa_inventario,
      usa_insumos: p.usa_insumos,
      cantidad_inicial: p.cantidad_inicial,
      cantidad_actual: p.cantidad_actual
    }));

    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: [
        'id', 'nombre', 'descripcion', 'precio', 'categoria', 'disponible',
        'tiene_personalizacion', 'personalizaciones_habilitadas',
        'usa_inventario', 'usa_insumos', 'cantidad_inicial', 'cantidad_actual'
      ]
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="productos.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar productos:', error);
    res.status(500).json({ error: 'Error al exportar productos' });
  }
});

router.post('/productos/import', async (req: Request, res: Response) => {
  const { fileBase64 } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ error: 'fileBase64 es requerido' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'El archivo no contiene datos' });
    }

    const errores: string[] = [];
    const productosProcesados: any[] = [];

    rows.forEach((row, index) => {
      if (!row.nombre || !row.precio || !row.categoria) {
        errores.push(`Fila ${index + 2}: nombre, precio y categoria son obligatorios`);
        return;
      }

      const precio = normalizarNumero(row.precio);
      if (precio === null || precio < 0) {
        errores.push(`Fila ${index + 2}: precio inválido`);
        return;
      }

      productosProcesados.push({
        id: row.id ? Number(row.id) : null,
        nombre: String(row.nombre).trim(),
        descripcion: row.descripcion ? String(row.descripcion) : null,
        precio,
        categoria: String(row.categoria).trim(),
        disponible: row.disponible ? 1 : 0,
        tiene_personalizacion: row.tiene_personalizacion ? 1 : 0,
        personalizaciones_habilitadas: row.personalizaciones_habilitadas || null,
        usa_inventario: row.usa_inventario ? 1 : 0,
        usa_insumos: row.usa_insumos ? 1 : 0,
        cantidad_inicial: normalizarNumero(row.cantidad_inicial),
        cantidad_actual: normalizarNumero(row.cantidad_actual)
      });
    });

    if (errores.length > 0) {
      return res.status(400).json({ error: errores.join(' | ') });
    }

    await runAsync('BEGIN TRANSACTION');

    for (const producto of productosProcesados) {
      if (producto.id) {
        await runAsync(
          `UPDATE productos
           SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, disponible = ?,
               tiene_personalizacion = ?, personalizaciones_habilitadas = ?,
               usa_inventario = ?, usa_insumos = ?, cantidad_inicial = ?, cantidad_actual = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            producto.nombre,
            producto.descripcion,
            producto.precio,
            producto.categoria,
            producto.disponible,
            producto.tiene_personalizacion,
            producto.personalizaciones_habilitadas,
            producto.usa_inventario,
            producto.usa_insumos,
            producto.cantidad_inicial,
            producto.cantidad_actual,
            producto.id
          ]
        );
      } else {
        await runAsync(
          `INSERT INTO productos (
             nombre, descripcion, precio, categoria, disponible,
             tiene_personalizacion, personalizaciones_habilitadas,
             usa_inventario, usa_insumos, cantidad_inicial, cantidad_actual
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            producto.nombre,
            producto.descripcion,
            producto.precio,
            producto.categoria,
            producto.disponible,
            producto.tiene_personalizacion,
            producto.personalizaciones_habilitadas,
            producto.usa_inventario,
            producto.usa_insumos,
            producto.cantidad_inicial,
            producto.cantidad_actual
          ]
        );
      }
    }

    await runAsync('COMMIT');
    res.json({ mensaje: 'Productos importados exitosamente', total: productosProcesados.length });
  } catch (error) {
    console.error('Error al importar productos:', error);
    try {
      await runAsync('ROLLBACK');
    } catch {
      // noop
    }
    res.status(500).json({ error: 'Error al importar productos' });
  }
});

export default router;
