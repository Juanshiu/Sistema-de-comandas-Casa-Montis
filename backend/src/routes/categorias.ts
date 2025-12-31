import { Router, Request, Response } from 'express';
import { db } from '../database/init';

const router = Router();

interface CategoriaProducto {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Obtener todas las categorías de productos
router.get('/', (req: Request, res: Response) => {
  const query = 'SELECT * FROM categorias_productos ORDER BY nombre';
  
  db.all(query, [], (err: any, rows: CategoriaProducto[]) => {
    if (err) {
      console.error('Error al obtener categorías:', err);
      return res.status(500).json({ error: 'Error al obtener las categorías' });
    }
    
    // Convertir valores de SQLite
    const categorias = rows.map(cat => ({
      ...cat,
      activo: Boolean(cat.activo)
    }));
    
    res.json(categorias);
  });
});

// Obtener categorías activas
router.get('/activas', (req: Request, res: Response) => {
  const query = 'SELECT * FROM categorias_productos WHERE activo = 1 ORDER BY nombre';
  
  db.all(query, [], (err: any, rows: CategoriaProducto[]) => {
    if (err) {
      console.error('Error al obtener categorías activas:', err);
      return res.status(500).json({ error: 'Error al obtener las categorías activas' });
    }
    
    const categorias = rows.map(cat => ({
      ...cat,
      activo: Boolean(cat.activo)
    }));
    
    res.json(categorias);
  });
});

// Obtener una categoría específica
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const query = 'SELECT * FROM categorias_productos WHERE id = ?';
  
  db.get(query, [id], (err: any, row: CategoriaProducto) => {
    if (err) {
      console.error('Error al obtener categoría:', err);
      return res.status(500).json({ error: 'Error al obtener la categoría' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    const categoria = {
      ...row,
      activo: Boolean(row.activo)
    };
    
    res.json(categoria);
  });
});

// Crear nueva categoría
router.post('/', (req: Request, res: Response) => {
  const { nombre, descripcion } = req.body;
  
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  // Normalizar nombre: lowercase con guiones bajos
  const nombreNormalizado = nombre.trim().toLowerCase().replace(/\s+/g, '_');
  
  const query = 'INSERT INTO categorias_productos (nombre, descripcion, activo) VALUES (?, ?, 1)';
  
  db.run(query, [nombreNormalizado, descripcion || null], function(err: any) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
      }
      console.error('Error al crear categoría:', err);
      return res.status(500).json({ error: 'Error al crear la categoría' });
    }
    
    // Obtener la categoría creada
    db.get('SELECT * FROM categorias_productos WHERE id = ?', [this.lastID], (err: any, row: CategoriaProducto) => {
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

// Actualizar categoría
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, activo } = req.body;
  
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  // Normalizar nombre
  const nombreNormalizado = nombre.trim().toLowerCase().replace(/\s+/g, '_');
  
  const query = 'UPDATE categorias_productos SET nombre = ?, descripcion = ?, activo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(query, [nombreNormalizado, descripcion || null, activo ? 1 : 0, id], function(err: any) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Ya existe una categoría con ese nombre' });
      }
      console.error('Error al actualizar categoría:', err);
      return res.status(500).json({ error: 'Error al actualizar la categoría' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    // Al actualizar una categoría, actualizar todos los productos que la usen
    const queryUpdateProductos = 'UPDATE productos SET categoria = ?, updated_at = CURRENT_TIMESTAMP WHERE categoria = (SELECT nombre FROM categorias_productos WHERE id = ?)';
    
    db.run(queryUpdateProductos, [nombreNormalizado, id], (err: any) => {
      if (err) {
        console.error('Error al actualizar productos de la categoría:', err);
      }
      
      // Obtener la categoría actualizada
      db.get('SELECT * FROM categorias_productos WHERE id = ?', [id], (err: any, row: CategoriaProducto) => {
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
});

// Eliminar categoría
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Verificar si la categoría tiene productos asociados
  db.get('SELECT nombre FROM categorias_productos WHERE id = ?', [id], (err: any, cat: any) => {
    if (err) {
      console.error('Error al obtener categoría:', err);
      return res.status(500).json({ error: 'Error al verificar categoría' });
    }
    
    if (!cat) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    db.get('SELECT COUNT(*) as count FROM productos WHERE categoria = ?', [cat.nombre], (err: any, row: any) => {
      if (err) {
        console.error('Error al verificar productos:', err);
        return res.status(500).json({ error: 'Error al verificar productos asociados' });
      }
      
      if (row.count > 0) {
        return res.status(400).json({ 
          error: `No se puede eliminar la categoría porque tiene ${row.count} producto(s) asociado(s). Primero reasigne o elimine los productos.` 
        });
      }
      
      // Eliminar la categoría
      const query = 'DELETE FROM categorias_productos WHERE id = ?';
      
      db.run(query, [id], function(err: any) {
        if (err) {
          console.error('Error al eliminar categoría:', err);
          return res.status(500).json({ error: 'Error al eliminar la categoría' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        
        res.json({ message: 'Categoría eliminada exitosamente' });
      });
    });
  });
});

// Obtener conteo de productos por categoría
router.get('/:id/productos/count', (req: Request, res: Response) => {
  const { id } = req.params;
  
  db.get('SELECT nombre FROM categorias_productos WHERE id = ?', [id], (err: any, cat: any) => {
    if (err) {
      console.error('Error al obtener categoría:', err);
      return res.status(500).json({ error: 'Error al obtener categoría' });
    }
    
    if (!cat) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    db.get('SELECT COUNT(*) as count FROM productos WHERE categoria = ?', [cat.nombre], (err: any, row: any) => {
      if (err) {
        console.error('Error al contar productos:', err);
        return res.status(500).json({ error: 'Error al contar productos' });
      }
      
      res.json({ count: row.count });
    });
  });
});

export default router;
