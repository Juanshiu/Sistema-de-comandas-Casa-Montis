import { Router, Request, Response } from 'express';
import { db } from '../database/init';
import { Producto } from '../models';
import { validateInventoryData, prepareInventoryValues } from '../utils/inventoryValidation';

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
      personalizaciones_habilitadas: producto.personalizaciones_habilitadas ? JSON.parse(producto.personalizaciones_habilitadas) : [],
      usa_inventario: Boolean(producto.usa_inventario),
      cantidad_inicial: producto.cantidad_inicial,
      cantidad_actual: producto.cantidad_actual
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
      personalizaciones_habilitadas: producto.personalizaciones_habilitadas ? JSON.parse(producto.personalizaciones_habilitadas as string) : [],
      usa_inventario: Boolean(producto.usa_inventario),
      cantidad_inicial: producto.cantidad_inicial,
      cantidad_actual: producto.cantidad_actual
    }));
    
    res.json(productos);
  });
});

// Obtener todos los productos (solo disponibles y de categorías activas)
router.get('/', (req: Request, res: Response) => {
  const query = `
    SELECT p.* 
    FROM productos p
    LEFT JOIN categorias_productos c ON p.categoria = c.nombre
    WHERE p.disponible = 1 
      AND (c.activo = 1 OR c.activo IS NULL)
    ORDER BY p.categoria, p.nombre
  `;
  
  db.all(query, [], (err: any, rows: Producto[]) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: 'Error al obtener los productos' });
    }
    
    const productos = rows.map(producto => ({
      ...producto,
      disponible: Boolean(producto.disponible),
      tiene_personalizacion: Boolean(producto.tiene_personalizacion),
      personalizaciones_habilitadas: producto.personalizaciones_habilitadas ? JSON.parse(producto.personalizaciones_habilitadas as string) : [],
      usa_inventario: Boolean(producto.usa_inventario),
      cantidad_inicial: producto.cantidad_inicial,
      cantidad_actual: producto.cantidad_actual
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
      personalizaciones_habilitadas: row.personalizaciones_habilitadas ? JSON.parse(row.personalizaciones_habilitadas) : [],
      usa_inventario: Boolean(row.usa_inventario),
      cantidad_inicial: row.cantidad_inicial,
      cantidad_actual: row.cantidad_actual
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
    personalizaciones_habilitadas = [],
    usa_inventario = false,
    cantidad_inicial = null
  } = req.body;
  
  if (!nombre || !precio || !categoria) {
    return res.status(400).json({ 
      error: 'Nombre, precio y categoría son requeridos' 
    });
  }

  // Validar inventario usando utilidad centralizada
  const inventoryValidation = validateInventoryData(usa_inventario, cantidad_inicial, null, true);
  if (!inventoryValidation.valid) {
    return res.status(400).json({ error: inventoryValidation.error });
  }
  
  const personalizacionesJson = tiene_personalizacion ? JSON.stringify(personalizaciones_habilitadas) : null;
  const inventoryValues = prepareInventoryValues(usa_inventario, cantidad_inicial, null, true);
  
  const query = `
    INSERT INTO productos (
      nombre, descripcion, precio, categoria, disponible, 
      tiene_personalizacion, personalizaciones_habilitadas,
      usa_inventario, cantidad_inicial, cantidad_actual
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [
    nombre, 
    descripcion, 
    precio, 
    categoria, 
    disponible ? 1 : 0,
    tiene_personalizacion ? 1 : 0,
    personalizacionesJson,
    inventoryValues.usa_inventario_db,
    inventoryValues.cantidad_inicial_db,
    inventoryValues.cantidad_actual_db
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
        personalizaciones_habilitadas: row.personalizaciones_habilitadas ? JSON.parse(row.personalizaciones_habilitadas) : [],
        usa_inventario: Boolean(row.usa_inventario),
        cantidad_inicial: row.cantidad_inicial,
        cantidad_actual: row.cantidad_actual
      };
      
      res.json(producto);
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
    personalizaciones_habilitadas = [],
    usa_inventario = false,
    cantidad_inicial = null,
    cantidad_actual = null
  } = req.body;
  
  if (!nombre || !precio || !categoria) {
    return res.status(400).json({ 
      error: 'Nombre, precio y categoría son requeridos' 
    });
  }

  // Validar inventario usando utilidad centralizada
  const inventoryValidation = validateInventoryData(usa_inventario, cantidad_inicial, cantidad_actual, false);
  if (!inventoryValidation.valid) {
    return res.status(400).json({ error: inventoryValidation.error });
  }
  
  const personalizacionesJson = tiene_personalizacion ? JSON.stringify(personalizaciones_habilitadas) : null;
  const inventoryValues = prepareInventoryValues(usa_inventario, cantidad_inicial, cantidad_actual, false);
  
  const query = `
    UPDATE productos 
    SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, disponible = ?, 
        tiene_personalizacion = ?, personalizaciones_habilitadas = ?,
        usa_inventario = ?, cantidad_inicial = ?, cantidad_actual = ?,
        updated_at = CURRENT_TIMESTAMP
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
    inventoryValues.usa_inventario_db,
    inventoryValues.cantidad_inicial_db,
    inventoryValues.cantidad_actual_db,
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
        personalizaciones_habilitadas: row.personalizaciones_habilitadas ? JSON.parse(row.personalizaciones_habilitadas) : [],
        usa_inventario: Boolean(row.usa_inventario),
        cantidad_inicial: row.cantidad_inicial,
        cantidad_actual: row.cantidad_actual
      };
      
      res.json(producto);
    });
  });
});

// Actualizar producto (PATCH)
router.patch('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    nombre, 
    descripcion, 
    precio, 
    categoria, 
    disponible,
    usa_inventario,
    cantidad_inicial,
    cantidad_actual
  } = req.body;
  
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
  if (usa_inventario !== undefined) {
    fields.push('usa_inventario = ?');
    values.push(usa_inventario ? 1 : 0);
  }
  if (cantidad_inicial !== undefined) {
    fields.push('cantidad_inicial = ?');
    values.push(cantidad_inicial);
  }
  if (cantidad_actual !== undefined) {
    // Validar cantidad_actual usando utilidad centralizada
    const validation = validateInventoryData(true, null, cantidad_actual, false);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    fields.push('cantidad_actual = ?');
    values.push(cantidad_actual);
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
