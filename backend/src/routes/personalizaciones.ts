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
  
  // Solo desactivar, no eliminar físicamente
  const query = 'UPDATE categorias_personalizacion SET activo = 0 WHERE id = ?';
  
  db.run(query, [id], function(err: any) {
    if (err) {
      console.error('Error al eliminar categoría:', err);
      return res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    res.json({ mensaje: 'Categoría desactivada exitosamente' });
  });
});

// ========== CALDOS ==========

// Obtener todos los caldos
router.get('/caldos', (req: Request, res: Response) => {
  const query = 'SELECT * FROM caldos ORDER BY nombre';
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener caldos:', err);
      return res.status(500).json({ error: 'Error al obtener los caldos' });
    }
    res.json(rows);
  });
});

// Crear nuevo caldo
router.post('/caldos', (req: Request, res: Response) => {
  const { nombre, precio_adicional = 0 } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  const id = uuidv4();
  const query = 'INSERT INTO caldos (id, nombre, precio_adicional) VALUES (?, ?, ?)';
  
  db.run(query, [id, nombre, precio_adicional], function(err: any) {
    if (err) {
      console.error('Error al crear caldo:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Ya existe un caldo con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al crear el caldo' });
    }
    
    // Obtener el caldo creado
    db.get('SELECT * FROM caldos WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener caldo creado:', err);
        return res.status(500).json({ error: 'Error al obtener el caldo creado' });
      }
      res.status(201).json(row);
    });
  });
});

// Actualizar caldo
router.patch('/caldos/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, precio_adicional } = req.body;
  
  const fields = [];
  const values = [];
  
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    values.push(nombre);
  }
  if (precio_adicional !== undefined) {
    fields.push('precio_adicional = ?');
    values.push(precio_adicional);
  }
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const query = `UPDATE caldos SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err: any) {
    if (err) {
      console.error('Error al actualizar caldo:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Ya existe un caldo con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al actualizar el caldo' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Caldo no encontrado' });
    }
    
    // Obtener el caldo actualizado
    db.get('SELECT * FROM caldos WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener caldo actualizado:', err);
        return res.status(500).json({ error: 'Error al obtener el caldo actualizado' });
      }
      res.json(row);
    });
  });
});

// Eliminar caldo
router.delete('/caldos/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM caldos WHERE id = ?';
  
  db.run(query, [id], function(err: any) {
    if (err) {
      console.error('Error al eliminar caldo:', err);
      return res.status(500).json({ error: 'Error al eliminar el caldo' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Caldo no encontrado' });
    }
    
    res.status(204).send();
  });
});

// ========== PRINCIPIOS ==========

// Obtener todos los principios
router.get('/principios', (req: Request, res: Response) => {
  const query = 'SELECT * FROM principios ORDER BY nombre';
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener principios:', err);
      return res.status(500).json({ error: 'Error al obtener los principios' });
    }
    res.json(rows);
  });
});

// Crear nuevo principio
router.post('/principios', (req: Request, res: Response) => {
  const { nombre, precio_adicional = 0 } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  const id = uuidv4();
  const query = 'INSERT INTO principios (id, nombre, precio_adicional) VALUES (?, ?, ?)';
  
  db.run(query, [id, nombre, precio_adicional], function(err: any) {
    if (err) {
      console.error('Error al crear principio:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Ya existe un principio con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al crear el principio' });
    }
    
    // Obtener el principio creado
    db.get('SELECT * FROM principios WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener principio creado:', err);
        return res.status(500).json({ error: 'Error al obtener el principio creado' });
      }
      res.status(201).json(row);
    });
  });
});

// Actualizar principio
router.patch('/principios/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, precio_adicional } = req.body;
  
  const fields = [];
  const values = [];
  
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    values.push(nombre);
  }
  if (precio_adicional !== undefined) {
    fields.push('precio_adicional = ?');
    values.push(precio_adicional);
  }
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const query = `UPDATE principios SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err: any) {
    if (err) {
      console.error('Error al actualizar principio:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Ya existe un principio con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al actualizar el principio' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Principio no encontrado' });
    }
    
    // Obtener el principio actualizado
    db.get('SELECT * FROM principios WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener principio actualizado:', err);
        return res.status(500).json({ error: 'Error al obtener el principio actualizado' });
      }
      res.json(row);
    });
  });
});

// Eliminar principio
router.delete('/principios/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM principios WHERE id = ?';
  
  db.run(query, [id], function(err: any) {
    if (err) {
      console.error('Error al eliminar principio:', err);
      return res.status(500).json({ error: 'Error al eliminar el principio' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Principio no encontrado' });
    }
    
    res.status(204).send();
  });
});

// ========== PROTEÍNAS ==========

// Obtener todas las proteínas
router.get('/proteinas', (req: Request, res: Response) => {
  const query = 'SELECT * FROM proteinas ORDER BY nombre';
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener proteínas:', err);
      return res.status(500).json({ error: 'Error al obtener las proteínas' });
    }
    res.json(rows);
  });
});

// Crear nueva proteína
router.post('/proteinas', (req: Request, res: Response) => {
  const { nombre, precio_adicional = 0 } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  const id = uuidv4();
  const query = 'INSERT INTO proteinas (id, nombre, precio_adicional) VALUES (?, ?, ?)';
  
  db.run(query, [id, nombre, precio_adicional], function(err: any) {
    if (err) {
      console.error('Error al crear proteína:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Ya existe una proteína con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al crear la proteína' });
    }
    
    // Obtener la proteína creada
    db.get('SELECT * FROM proteinas WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener proteína creada:', err);
        return res.status(500).json({ error: 'Error al obtener la proteína creada' });
      }
      res.status(201).json(row);
    });
  });
});

// Actualizar proteína
router.patch('/proteinas/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, precio_adicional } = req.body;
  
  const fields = [];
  const values = [];
  
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    values.push(nombre);
  }
  if (precio_adicional !== undefined) {
    fields.push('precio_adicional = ?');
    values.push(precio_adicional);
  }
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const query = `UPDATE proteinas SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err: any) {
    if (err) {
      console.error('Error al actualizar proteína:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Ya existe una proteína con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al actualizar la proteína' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Proteína no encontrada' });
    }
    
    // Obtener la proteína actualizada
    db.get('SELECT * FROM proteinas WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener proteína actualizada:', err);
        return res.status(500).json({ error: 'Error al obtener la proteína actualizada' });
      }
      res.json(row);
    });
  });
});

// Eliminar proteína
router.delete('/proteinas/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM proteinas WHERE id = ?';
  
  db.run(query, [id], function(err: any) {
    if (err) {
      console.error('Error al eliminar proteína:', err);
      return res.status(500).json({ error: 'Error al eliminar la proteína' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Proteína no encontrada' });
    }
    
    res.status(204).send();
  });
});

// ========== BEBIDAS ==========

// Obtener todas las bebidas
router.get('/bebidas', (req: Request, res: Response) => {
  const query = 'SELECT * FROM bebidas ORDER BY nombre';
  
  db.all(query, [], (err: any, rows: any[]) => {
    if (err) {
      console.error('Error al obtener bebidas:', err);
      return res.status(500).json({ error: 'Error al obtener las bebidas' });
    }
    res.json(rows);
  });
});

// Crear nueva bebida
router.post('/bebidas', (req: Request, res: Response) => {
  const { nombre, precio_adicional = 0 } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  const id = uuidv4();
  const query = 'INSERT INTO bebidas (id, nombre, precio_adicional) VALUES (?, ?, ?)';
  
  db.run(query, [id, nombre, precio_adicional], function(err: any) {
    if (err) {
      console.error('Error al crear bebida:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Ya existe una bebida con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al crear la bebida' });
    }
    
    // Obtener la bebida creada
    db.get('SELECT * FROM bebidas WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener bebida creada:', err);
        return res.status(500).json({ error: 'Error al obtener la bebida creada' });
      }
      res.status(201).json(row);
    });
  });
});

// Actualizar bebida
router.patch('/bebidas/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, precio_adicional } = req.body;
  
  const fields = [];
  const values = [];
  
  if (nombre !== undefined) {
    fields.push('nombre = ?');
    values.push(nombre);
  }
  if (precio_adicional !== undefined) {
    fields.push('precio_adicional = ?');
    values.push(precio_adicional);
  }
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
  }
  
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const query = `UPDATE bebidas SET ${fields.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function(err: any) {
    if (err) {
      console.error('Error al actualizar bebida:', err);
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Ya existe una bebida con ese nombre' });
      }
      return res.status(500).json({ error: 'Error al actualizar la bebida' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Bebida no encontrada' });
    }
    
    // Obtener la bebida actualizada
    db.get('SELECT * FROM bebidas WHERE id = ?', [id], (err: any, row: any) => {
      if (err) {
        console.error('Error al obtener bebida actualizada:', err);
        return res.status(500).json({ error: 'Error al obtener la bebida actualizada' });
      }
      res.json(row);
    });
  });
});

// Eliminar bebida
router.delete('/bebidas/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM bebidas WHERE id = ?';
  
  db.run(query, [id], function(err: any) {
    if (err) {
      console.error('Error al eliminar bebida:', err);
      return res.status(500).json({ error: 'Error al eliminar la bebida' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Bebida no encontrada' });
    }
    
    res.status(204).send();
  });
});

export default router;
