import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

import { initDatabase } from './database/init';
import { updateDatabaseWithProducts } from './database/update';
import { crearTablasPersonalizaciones } from './database/migration-personalizaciones';
import { migrarSalonesYMesas } from './database/migration-salones';
import { initMigrationControl, migracionSalones_v1 } from './database/migration-control';
import { migrarMultiplesMesas } from './database/migration-multiples-mesas';
import { arreglarEstructuraComandas } from './database/migration-arreglar-comandas';
import mesasRoutes from './routes/mesas';
import salonesRoutes from './routes/salones';
import productosRoutes from './routes/productos';
import comandasRoutes from './routes/comandas';
import facturasRoutes from './routes/facturas';
import reportesRoutes from './routes/reportes';
import personalizacionesRoutes from './routes/personalizaciones';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.18.210:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas de API
app.use('/api/mesas', mesasRoutes);
app.use('/api/salones', salonesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/comandas', comandasRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/personalizaciones', personalizacionesRoutes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.1.0'
  });
});

// Manejo de errores
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Inicializar base de datos y servidor
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Base de datos inicializada');
    
    // Inicializar control de migraciones
    await initMigrationControl();
    console.log('✅ Control de migraciones inicializado');
    
    // Crear tablas de personalizaciones
    await crearTablasPersonalizaciones();
    console.log('✅ Tablas de personalizaciones inicializadas');
    
    // Ejecutar migración de salones (solo una vez)
    await migracionSalones_v1();
    console.log('✅ Migración de salones verificada');
    
    // Asegurar estructura correcta de comandas y múltiples mesas
    await migrarMultiplesMesas();
    console.log('✅ Migración de múltiples mesas verificada');
    
    // Actualizar con productos y mesas reales
    await updateDatabaseWithProducts();
    console.log('✅ Datos actualizados');
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Error al inicializar el servidor:', error);
    process.exit(1);
  }
}

startServer();

export default app;
