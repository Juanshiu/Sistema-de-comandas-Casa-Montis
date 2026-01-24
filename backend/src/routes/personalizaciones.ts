import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

const router = Router();

// Helpers para base de datos async
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

const normalizarNumero = (val: any): number | null => {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

// ========== CATEGORÍAS DE PERSONALIZACIÓN ==========

// Obtener todas las categorías de personalización
router.get('/categorias', (req: Request, res: Response) => {
  const query = 'SELECT * FROM categorias_personalizacion WHERE activo = 1 ORDER BY orden, nombre';
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener categorías de personalización:', err);
      return res.status(500).json({ error: 'Error al obtener las categorías' });
    }
    
    const categorias = rows.map(cat => ({
      ...cat,
      activo: Boolean(cat.activo)
    }));
    
    res.json(categorias);
  });
});

// Crear nueva categoría de personalización
router.post('/categorias', (req: Request, res: Response) => {
  const { nombre, descripcion = '', orden = 0 } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  const query = 'INSERT INTO categorias_personalizacion (nombre, descripcion, orden, activo) VALUES (?, ?, ?, 1)';
  
  db.run(query, [nombre, descripcion, orden], function(err: any) {
    if (err) {
      console.error('Error al crear categoría:', err);
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al crear la categoría' });
    }
    
    db.get('SELECT * FROM categorias_personalizacion WHERE id = ?', [this.lastID], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener categoría creada:', err);
        return res.status(500).json({ error: 'Error al obtener la categoría creada' });
      }
      
      const categoria = {
        ...row,
        activo: Boolean(row.activo)
      };
      
      res.status(201).json(categoria);
    });
  });
});

// Actualizar categoría de personalización
router.put('/categorias/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, orden, activo } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  const query = `
    UPDATE categorias_personalizacion 
    SET nombre = ?, descripcion = ?, orden = ?, activo = ?
    WHERE id = ?
  `;
  
  db.run(query, [nombre, descripcion || '', orden || 0, activo ? 1 : 0, id], function(err: any) {
    if (err) {
      console.error('Error al actualizar categoría:', err);
      return res.status(500).json({ error: 'Error al actualizar la categoría' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    db.get('SELECT * FROM categorias_personalizacion WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener categoría actualizada:', err);
        return res.status(500).json({ error: 'Error al obtener la categoría actualizada' });
      }
      
      const categoria = {
        ...row,
        activo: Boolean(row.activo)
      };
      
      res.json(categoria);
    });
  });
});

// Eliminar categoría de personalización
router.delete('/categorias/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Eliminar físicamente la categoría
  const query = 'DELETE FROM categorias_personalizacion WHERE id = ?';
  
  db.run(query, [id], function(err: any) {
    if (err) {
      console.error('Error al eliminar categoría:', err);
      return res.status(500).json({ 
        error: 'Error al eliminar la categoría',
        detalles: err.message 
      });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    console.log(`✅ Categoría ${id} eliminada exitosamente`);
    res.json({ mensaje: 'Categoría eliminada exitosamente' });
  });
});

// ===== ENDPOINTS GENÉRICOS PARA ITEMS DE CUALQUIER CATEGORÍA =====

// Obtener todos los items de una categoría
router.get('/categorias/:categoriaId/items', (req: Request, res: Response) => {
  const { categoriaId } = req.params;
  
  const query = 'SELECT * FROM items_personalizacion WHERE categoria_id = ? AND activo = 1 ORDER BY nombre';
  
  db.all(query, [categoriaId], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener items de personalización:', err);
      return res.status(500).json({ error: 'Error al obtener items' });
    }
    
    // Mapear items y calcular disponibilidad real
    const items = rows.map(item => {
      const usaInventario = Boolean(item.usa_inventario);
      let disponible = Boolean(item.disponible);
      
      // Si usa inventario y cantidad_actual es 0, automáticamente no disponible
      if (usaInventario && item.cantidad_actual !== null && item.cantidad_actual <= 0) {
        disponible = false;
      }
      
      return {
        ...item,
        usa_inventario: usaInventario,
        disponible: disponible ? 1 : 0
      };
    });
    
    res.json(items || []);
  });
});

// Crear un nuevo item para una categoría
router.post('/categorias/:categoriaId/items', (req: Request, res: Response) => {
  const { categoriaId } = req.params;
  const { nombre, descripcion, precio_adicional, usa_inventario, usa_insumos, cantidad_inicial } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  
  // Validar inventario si está habilitado
  const usaInv = Boolean(usa_inventario);
  if (usaInv && (cantidad_inicial === undefined || cantidad_inicial === null || cantidad_inicial < 0)) {
    return res.status(400).json({ error: 'Debe especificar una cantidad inicial válida cuando usa inventario' });
  }
  
  const query = `
    INSERT INTO items_personalizacion (
      categoria_id, nombre, descripcion, precio_adicional,
      usa_inventario, usa_insumos, cantidad_inicial, cantidad_actual
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const cantidadIni = usaInv ? cantidad_inicial : null;
  const cantidadAct = usaInv ? cantidad_inicial : null;
  
  db.run(query, [
    categoriaId, 
    nombre, 
    descripcion || null, 
    precio_adicional || 0,
    usaInv ? 1 : 0,
    usa_insumos ? 1 : 0,
    cantidadIni,
    cantidadAct
  ], function(err: any) {
    if (err) {
      console.error('Error al crear item de personalización:', err);
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ 
          error: 'Ya existe un item con ese nombre en esta categoría',
          detalles: err.message 
        });
      }
      return res.status(500).json({ error: 'Error al crear el item' });
    }
    
    db.get('SELECT * FROM items_personalizacion WHERE id = ?', [this.lastID], (err: any, row: any) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener el item creado' });
      }
      res.status(201).json(row);
    });
  });
});

// Actualizar un item
router.put('/categorias/:categoriaId/items/:itemId', (req: Request, res: Response) => {
  const { categoriaId, itemId } = req.params;
  const { nombre, descripcion, precio_adicional, usa_inventario, usa_insumos, cantidad_inicial, cantidad_actual } = req.body;
  
  // Validar inventario si está habilitado
  const usaInv = Boolean(usa_inventario);
  if (usaInv && cantidad_inicial !== undefined && cantidad_inicial < 0) {
    return res.status(400).json({ error: 'La cantidad inicial debe ser mayor o igual a 0' });
  }
  if (usaInv && cantidad_actual !== undefined && cantidad_actual < 0) {
    return res.status(400).json({ error: 'La cantidad actual debe ser mayor o igual a 0' });
  }
  
  const query = `
    UPDATE items_personalizacion 
    SET nombre = ?, descripcion = ?, precio_adicional = ?, 
      usa_inventario = ?, usa_insumos = ?, cantidad_inicial = ?, cantidad_actual = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND categoria_id = ?
  `;
  
  // Si no usa inventario, guardar NULL en los campos de cantidad
  const cantidadIni = usaInv ? (cantidad_inicial !== undefined ? cantidad_inicial : null) : null;
  const cantidadAct = usaInv ? (cantidad_actual !== undefined ? cantidad_actual : null) : null;
  
  db.run(query, [
    nombre, 
    descripcion || null, 
    precio_adicional || 0, 
    usaInv ? 1 : 0,
    usa_insumos ? 1 : 0,
    cantidadIni,
    cantidadAct,
    itemId, 
    categoriaId
  ], function(err: any) {
    if (err) {
      console.error('Error al actualizar item:', err);
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ 
          error: 'Ya existe un item con ese nombre en esta categoría',
          detalles: err.message 
        });
      }
      return res.status(500).json({ error: 'Error al actualizar el item' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    db.get('SELECT * FROM items_personalizacion WHERE id = ?', [itemId], (err: any, row: any) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener el item actualizado' });
      }
      res.json(row);
    });
  });
});

// Eliminar un item
router.delete('/categorias/:categoriaId/items/:itemId', (req: Request, res: Response) => {
  const { categoriaId, itemId } = req.params;
  
  const query = 'DELETE FROM items_personalizacion WHERE id = ? AND categoria_id = ?';
  
  db.run(query, [itemId, categoriaId], function(err: any) {
    if (err) {
      console.error('Error al eliminar item:', err);
      return res.status(500).json({ error: 'Error al eliminar el item' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.json({ mensaje: 'Item eliminado exitosamente' });
  });
});

// Decrementar inventario de un item (usado al crear/editar comandas)
router.patch('/categorias/:categoriaId/items/:itemId/decrementar', (req: Request, res: Response) => {
  const { categoriaId, itemId } = req.params;
  const { cantidad } = req.body;
  
  if (!cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
  }
  
  // Verificar que el item use inventario
  db.get('SELECT * FROM items_personalizacion WHERE id = ? AND categoria_id = ?', [itemId, categoriaId], (err: any, item: any) => {
    if (err) {
      console.error('Error al obtener item:', err);
      return res.status(500).json({ error: 'Error al obtener el item' });
    }
    
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    if (!item.usa_inventario) {
      // Si no usa inventario, no hacer nada y retornar éxito
      return res.json({ mensaje: 'Item no usa inventario', item });
    }
    
    // Verificar que haya suficiente inventario
    if (item.cantidad_actual === null || item.cantidad_actual < cantidad) {
      return res.status(400).json({ 
        error: 'Inventario insuficiente',
        disponible: item.cantidad_actual || 0,
        solicitado: cantidad
      });
    }
    
    // Decrementar inventario
    const nuevaCantidad = item.cantidad_actual - cantidad;
    
    const updateQuery = `
      UPDATE items_personalizacion 
      SET cantidad_actual = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND categoria_id = ?
    `;
    
    db.run(updateQuery, [nuevaCantidad, itemId, categoriaId], function(err: any) {
      if (err) {
        console.error('Error al decrementar inventario:', err);
        return res.status(500).json({ error: 'Error al actualizar inventario' });
      }
      
      // Si llegó a 0, también marcar como no disponible
      if (nuevaCantidad <= 0) {
        db.run(
          'UPDATE items_personalizacion SET disponible = 0 WHERE id = ?',
          [itemId],
          (err: any) => {
            if (err) {
              console.error('Error al marcar como no disponible:', err);
            }
          }
        );
      }
      
      db.get('SELECT * FROM items_personalizacion WHERE id = ?', [itemId], (err: any, updatedItem: any) => {
        if (err) {
          return res.status(500).json({ error: 'Error al obtener item actualizado' });
        }
        
        res.json({ 
          mensaje: `Inventario decrementado. Cantidad actual: ${nuevaCantidad}`,
          item: updatedItem,
          cantidad_anterior: item.cantidad_actual,
          cantidad_decrementada: cantidad,
          cantidad_nueva: nuevaCantidad
        });
      });
    });
  });
});

// Cambiar disponibilidad de un item
router.patch('/categorias/:categoriaId/items/:itemId/disponibilidad', (req: Request, res: Response) => {
  const { categoriaId, itemId } = req.params;
  const { disponible } = req.body;
  
  if (disponible === undefined) {
    return res.status(400).json({ error: 'El campo disponible es requerido' });
  }
  
  const query = `
    UPDATE items_personalizacion 
    SET disponible = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND categoria_id = ?
  `;
  
  db.run(query, [disponible ? 1 : 0, itemId, categoriaId], function(err: any) {
    if (err) {
      console.error('Error al actualizar disponibilidad:', err);
      return res.status(500).json({ error: 'Error al actualizar disponibilidad' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    db.get('SELECT * FROM items_personalizacion WHERE id = ?', [itemId], (err: any, row: any) => {
      if (err) {
        return res.status(500).json({ error: 'Error al obtener item actualizado' });
      }
      res.json({ 
        mensaje: `Item ${disponible ? 'disponible' : 'no disponible'}`, 
        item: row 
      });
    });
  });
});

// ========== IMPORTAR / EXPORTAR PERSONALIZACIONES ==========

router.get('/export', async (req: Request, res: Response) => {
  try {
    const categorias = await allAsync('SELECT * FROM categorias_personalizacion ORDER BY orden, nombre');
    const items = await allAsync('SELECT * FROM items_personalizacion ORDER BY categoria_id, nombre');

    const wb = XLSX.utils.book_new();
    
    const wsCategorias = XLSX.utils.json_to_sheet(categorias);
    XLSX.utils.book_append_sheet(wb, wsCategorias, 'Categorias');
    
    const wsItems = XLSX.utils.json_to_sheet(items);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Items');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=personalizaciones.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error al exportar personalizaciones:', error);
    res.status(500).json({ error: 'Error al exportar personalizaciones' });
  }
});

router.post('/import', async (req: Request, res: Response) => {
  const { fileBase64 } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ error: 'Archivo no proporcionado' });
  }

  try {
    const buffer = Buffer.from(fileBase64, 'base64');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    
    const categoriasSheet = wb.Sheets['Categorias'];
    const itemsSheet = wb.Sheets['Items'];

    if (!categoriasSheet) {
      return res.status(400).json({ error: 'Falta la hoja de "Categorias" en el archivo' });
    }

    const categoriasRows: any[] = XLSX.utils.sheet_to_json(categoriasSheet);
    const itemsRows: any[] = itemsSheet ? XLSX.utils.sheet_to_json(itemsSheet) : [];

    await runAsync('BEGIN TRANSACTION');

    // Mapeo para mantener consistencia de IDs de categorías si cambian en la base de datos
    // En una importación destructiva/reemplazo total, esto es más simple.
    // Aquí haremos un "Upsert" basado en el nombre de la categoría.

    for (const catRow of categoriasRows) {
      if (!catRow.nombre) continue;

      const existingCat = await getAsync('SELECT id FROM categorias_personalizacion WHERE nombre = ?', [catRow.nombre]);
      let catId: number;

      if (existingCat) {
        catId = existingCat.id;
        await runAsync(
          'UPDATE categorias_personalizacion SET descripcion = ?, orden = ?, activo = ? WHERE id = ?',
          [catRow.descripcion || '', catRow.orden || 0, catRow.activo === 0 ? 0 : 1, catId]
        );
      } else {
        await runAsync(
          'INSERT INTO categorias_personalizacion (nombre, descripcion, orden, activo) VALUES (?, ?, ?, ?)',
          [catRow.nombre, catRow.descripcion || '', catRow.orden || 0, catRow.activo === 0 ? 0 : 1]
        );
        const newCat = await getAsync('SELECT id FROM categorias_personalizacion WHERE nombre = ?', [catRow.nombre]);
        catId = newCat.id;
      }

      // Ahora procesar los items para esta categoría
      const itemsDeEstaCat = itemsRows.filter(i => {
        // Puede venir por categoria_id (original) o por un campo categoria_nombre si lo añadimos al excel
        // Por simplicidad en este caso, usaremos el ID original pero verificando si el nombre coincide.
        return i.categoria_id === catRow.id;
      });

      for (const itemRow of itemsDeEstaCat) {
        if (!itemRow.nombre) continue;

        const existingItem = await getAsync(
          'SELECT id FROM items_personalizacion WHERE categoria_id = ? AND nombre = ?',
          [catId, itemRow.nombre]
        );

        if (existingItem) {
          await runAsync(
            'UPDATE items_personalizacion SET descripcion = ?, precio_adicional = ?, activo = ?, disponible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [
              itemRow.descripcion || '',
              normalizarNumero(itemRow.precio_adicional) || 0,
              itemRow.activo === 0 ? 0 : 1,
              itemRow.disponible === 0 ? 0 : 1,
              existingItem.id
            ]
          );
        } else {
          await runAsync(
            'INSERT INTO items_personalizacion (categoria_id, nombre, descripcion, precio_adicional, activo, disponible) VALUES (?, ?, ?, ?, ?, ?)',
            [
              catId,
              itemRow.nombre,
              itemRow.descripcion || '',
              normalizarNumero(itemRow.precio_adicional) || 0,
              itemRow.activo === 0 ? 0 : 1,
              itemRow.disponible === 0 ? 0 : 1
            ]
          );
        }
      }
    }

    await runAsync('COMMIT');
    res.json({ mensaje: 'Personalizaciones importadas correctamente' });
  } catch (error) {
    console.error('Error al importar personalizaciones:', error);
    try { await runAsync('ROLLBACK'); } catch (e) {}
    res.status(500).json({ error: 'Error al importar personalizaciones' });
  }
});

export default router;
