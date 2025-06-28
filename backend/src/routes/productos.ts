import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Producto } from '../models';

const router = Router();

// Obtener todos los productos
router.get('/', (req: Request, res: Response) => {
  const query = 'SELECT * FROM productos WHERE disponible = 1 ORDER BY categoria, nombre';
  
  db.all(query, [], (err: any, rows: Producto[]) => {
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
router.get('/categoria/:categoria', (req: Request, res: Response) => {
  const { categoria } = req.params;
  const query = 'SELECT * FROM productos WHERE categoria = ? AND disponible = 1 ORDER BY nombre';
  
  db.all(query, [categoria], (err: any, rows: Producto[]) => {
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
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const query = 'SELECT * FROM productos WHERE id = ?';
  
  db.get(query, [id], (err: any, row: Producto) => {
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
router.post('/', (req: Request, res: Response) => {
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
  
  db.run(query, [nombre, descripcion, precio, categoria, disponible ? 1 : 0], function(err: any) {
    if (err) {
      console.error('Error al crear producto:', err);
      return res.status(500).json({ error: 'Error al crear el producto' });
    }
    
    // Obtener el producto creado
    db.get('SELECT * FROM productos WHERE id = ?', [this.lastID], (err: any, row: Producto) => {
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
router.put('/:id', (req: Request, res: Response) => {
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
  
  db.run(query, [nombre, descripcion, precio, categoria, disponible ? 1 : 0, id], function(err: any) {
    if (err) {
      console.error('Error al actualizar producto:', err);
      return res.status(500).json({ error: 'Error al actualizar el producto' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Obtener el producto actualizado
    db.get('SELECT * FROM productos WHERE id = ?', [id], (err: any, row: Producto) => {
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
router.patch('/:id/disponibilidad', (req: Request, res: Response) => {
  const { id } = req.params;
  const { disponible } = req.body;
  
  if (typeof disponible !== 'boolean') {
    return res.status(400).json({ error: 'El campo disponible debe ser un boolean' });
  }
  
  const query = 'UPDATE productos SET disponible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(query, [disponible ? 1 : 0, id], function(err: any) {
    if (err) {
      console.error('Error al actualizar disponibilidad:', err);
      return res.status(500).json({ error: 'Error al actualizar la disponibilidad' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Obtener el producto actualizado
    db.get('SELECT * FROM productos WHERE id = ?', [id], (err: any, row: Producto) => {
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

export default router;
