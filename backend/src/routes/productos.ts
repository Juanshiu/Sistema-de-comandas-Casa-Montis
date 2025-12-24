import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Producto } from '../models';

const router = Router();

// Obtener todas las categorías únicas
router.get('/categorias', (req: Request, res: Response) => {
  const query = 'SELECT DISTINCT categoria FROM productos WHERE categoria IS NOT NULL AND categoria != "" ORDER BY categoria';
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener categorías:', err);
      return res.status(500).json({ error: 'Error al obtener las categorías' });
    }
    
    const categorias = rows.map(row => row.categoria);
    res.json(categorias);
  });
});

// Obtener todos los productos (incluyendo no disponibles) - para administración
router.get('/all', (req: Request, res: Response) => {
  const query = 'SELECT * FROM productos ORDER BY categoria, nombre';
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener todos los productos:', err);
      return res.status(500).json({ error: 'Error al obtener los productos' });
    }
    
    const productos = rows.map(producto => ({
      ...producto,
      disponible: Boolean(producto.disponible),
      tiene_personalizacion: Boolean(producto.tiene_personalizacion),
      personalizaciones_habilitadas: producto.personalizaciones_habilitadas ? JSON.parse(producto.personalizaciones_habilitadas) : []
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
      disponible: Boolean(producto.disponible),
      tiene_personalizacion: Boolean(producto.tiene_personalizacion),
      personalizaciones_habilitadas: producto.personalizaciones_habilitadas ? JSON.parse(producto.personalizaciones_habilitadas as string) : []
    }));
    
    res.json(productos);
  });
});

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
      disponible: Boolean(producto.disponible),
      tiene_personalizacion: Boolean(producto.tiene_personalizacion),
      personalizaciones_habilitadas: producto.personalizaciones_habilitadas ? JSON.parse(producto.personalizaciones_habilitadas as string) : []
    }));
    
    res.json(productos);
  });
});

// Obtener un producto específico
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const query = 'SELECT * FROM productos WHERE id = ?';
  
  db.get(query, [id], (err: any, row: any) => {
    if (err) {
      console.error('Error al obtener producto:', err);
      return res.status(500).json({ error: 'Error al obtener el producto' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const producto = {
      ...row,
      disponible: Boolean(row.disponible),
      tiene_personalizacion: Boolean(row.tiene_personalizacion),
      personalizaciones_habilitadas: row.personalizaciones_habilitadas ? JSON.parse(row.personalizaciones_habilitadas) : []
    };
    
    res.json(producto);
  });
});

// Crear nuevo producto
router.post('/', (req: Request, res: Response) => {
  const { 
    nombre, 
    descripcion, 
    precio, 
    categoria, 
    disponible = true,
    tiene_personalizacion = false,
    personalizaciones_habilitadas = []
  } = req.body;
  
  if (!nombre || !precio || !categoria) {
    return res.status(400).json({ 
      error: 'Nombre, precio y categoría son requeridos' 
    });
  }
  
  const personalizacionesJson = tiene_personalizacion ? JSON.stringify(personalizaciones_habilitadas) : null;
  
  const query = `
    INSERT INTO productos (nombre, descripcion, precio, categoria, disponible, tiene_personalizacion, personalizaciones_habilitadas) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [
    nombre, 
    descripcion, 
    precio, 
    categoria, 
    disponible ? 1 : 0,
    tiene_personalizacion ? 1 : 0,
    personalizacionesJson
  ], function(err: any) {
    if (err) {
      console.error('Error al crear producto:', err);
      return res.status(500).json({ error: 'Error al crear el producto' });
    }
    
    // Obtener el producto creado
    db.get('SELECT * FROM productos WHERE id = ?', [this.lastID], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener producto creado:', err);
        return res.status(500).json({ error: 'Error al obtener el producto creado' });
      }
      
      const producto = {
        ...row,
        disponible: Boolean(row.disponible),
        tiene_personalizacion: Boolean(row.tiene_personalizacion),
        personalizaciones_habilitadas: row.personalizaciones_habilitadas ? JSON.parse(row.personalizaciones_habilitadas) : []
      };
      
      res.status(201).json(producto);
    });
  });
});

// Actualizar producto
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    nombre, 
    descripcion, 
    precio, 
    categoria, 
    disponible,
    tiene_personalizacion = false,
    personalizaciones_habilitadas = []
  } = req.body;
  
  if (!nombre || !precio || !categoria) {
    return res.status(400).json({ 
      error: 'Nombre, precio y categoría son requeridos' 
    });
  }
  
  const personalizacionesJson = tiene_personalizacion ? JSON.stringify(personalizaciones_habilitadas) : null;
  
  const query = `
    UPDATE productos 
    SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, disponible = ?, 
        tiene_personalizacion = ?, personalizaciones_habilitadas = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  db.run(query, [
    nombre, 
    descripcion, 
    precio, 
    categoria, 
    disponible ? 1 : 0,
    tiene_personalizacion ? 1 : 0,
    personalizacionesJson,
    id
  ], function(err: any) {
    if (err) {
      console.error('Error al actualizar producto:', err);
      return res.status(500).json({ error: 'Error al actualizar el producto' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Obtener el producto actualizado
    db.get('SELECT * FROM productos WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener producto actualizado:', err);
        return res.status(500).json({ error: 'Error al obtener el producto actualizado' });
      }
      
      const producto = {
        ...row,
        disponible: Boolean(row.disponible),
        tiene_personalizacion: Boolean(row.tiene_personalizacion),
        personalizaciones_habilitadas: row.personalizaciones_habilitadas ? JSON.parse(row.personalizaciones_habilitadas) : []
      };
      
      res.json(producto);
    });
  });
});

// Actualizar producto (PATCH)
router.patch('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, categoria, disponible } = req.body;
  
  // Construir query dinámicamente solo con campos presentes
  const fields = [];
  const values = [];
  
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    values.push(nombre);
  }
  if (descripcion !== undefined) {
    fields.push('descripcion = ?');
    values.push(descripcion);
  }
  if (precio !== undefined) {
    fields.push('precio = ?');
    values.push(precio);
  }
  if (categoria !== undefined) {
    fields.push('categoria = ?');
    values.push(categoria);
  }
  if (disponible !== undefined) {
    fields.push('disponible = ?');
    values.push(disponible ? 1 : 0);
  }
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const query = `UPDATE productos SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err: any) {
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

// Eliminar producto
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM productos WHERE id = ?';
  
  db.run(query, [id], function(err: any) {
    if (err) {
      console.error('Error al eliminar producto:', err);
      return res.status(500).json({ error: 'Error al eliminar el producto' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.status(204).send();
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
