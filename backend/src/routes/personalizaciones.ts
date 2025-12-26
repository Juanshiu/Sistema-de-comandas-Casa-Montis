import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

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
    res.json(rows || []);
  });
});

// Crear un nuevo item para una categoría
router.post('/categorias/:categoriaId/items', (req: Request, res: Response) => {
  const { categoriaId } = req.params;
  const { nombre, descripcion, precio_adicional } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  
  const query = `
    INSERT INTO items_personalizacion (categoria_id, nombre, descripcion, precio_adicional)
    VALUES (?, ?, ?, ?)
  `;
  
  db.run(query, [categoriaId, nombre, descripcion || null, precio_adicional || 0], function(err: any) {
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
  const { nombre, descripcion, precio_adicional } = req.body;
  
  const query = `
    UPDATE items_personalizacion 
    SET nombre = ?, descripcion = ?, precio_adicional = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND categoria_id = ?
  `;
  
  db.run(query, [nombre, descripcion || null, precio_adicional || 0, itemId, categoriaId], function(err: any) {
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

export default router;
