import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

import { initDatabase } from './database/init';
import { updateDatabaseWithProducts } from './database/update';
import { crearTablasPersonalizaciones } from './database/migration-personalizaciones';
import { initMigrationControl, migracionSalones_v1 } from './database/migration-control';
import { migrarMultiplesMesas } from './database/migration-multiples-mesas';
import { migrarPersonalizacionesProductos } from './database/migration-personalizaciones-productos';
import { migrarUsuariosYRoles } from './database/migration-usuarios-roles';
import { migrarColumnasComandas } from './database/migration-fix-comandas-columns';
import { iniciarPluginImpresora } from './services/pluginImpresora';
import authRoutes from './routes/auth';
import usuariosRoutes from './routes/usuarios';
import rolesRoutes from './routes/roles';
import mesasRoutes from './routes/mesas';
import salonesRoutes from './routes/salones';
import productosRoutes from './routes/productos';
import categoriasRoutes from './routes/categorias';
import comandasRoutes from './routes/comandas-nuevas';
import facturasRoutes from './routes/facturas';
import reportesRoutes from './routes/reportes';
import personalizacionesRoutes from './routes/personalizaciones';
import sistemaRoutes from './routes/sistema';
import configuracionFacturacionRoutes from './routes/configuracion-facturacion';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middlewares
app.use(helmet());
app.use(compression());

// Configuración de CORS para permitir acceso desde cualquier dispositivo en la red local
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como desde Postman o apps móviles)
    if (!origin) return callback(null, true);
    
    // Permitir localhost en cualquier puerto
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Permitir cualquier IP de red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localIpPattern = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
    
    if (localIpPattern.test(origin)) {
      return callback(null, true);
    }
    
    // Si no coincide con ninguno, rechazar
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas de API (públicas - sin autenticación)
app.use('/api/auth', authRoutes);

// Rutas de API (protegidas - requieren autenticación)
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/salones', salonesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/comandas', comandasRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/personalizaciones', personalizacionesRoutes);
app.use('/api/sistema', sistemaRoutes);
app.use('/api/configuracion/facturacion', configuracionFacturacionRoutes);

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
    
    // Migrar personalizaciones en productos
    await migrarPersonalizacionesProductos();
    console.log('✅ Migración de personalizaciones en productos completada');
    
    // Migrar usuarios y roles
    await migrarUsuariosYRoles();
    console.log('✅ Migración de usuarios y roles completada');

    // Corregir columnas faltantes en comandas
    await migrarColumnasComandas();
    console.log('✅ Corrección de columnas en comandas completada');
    
    // Actualizar con productos y mesas reales
    await updateDatabaseWithProducts();
    console.log('✅ Datos actualizados');
    
    app.listen(PORT, '0.0.0.0', () => {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let localIP = 'localhost';
      
      // Obtener la IP local
      Object.keys(networkInterfaces).forEach((interfaceName) => {
        networkInterfaces[interfaceName].forEach((iface: any) => {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
          }
        });
      });
      
      console.log(`🚀 Servidor ejecutándose en:`);
      console.log(`   - Local:   http://localhost:${PORT}`);
      console.log(`   - Red:     http://${localIP}:${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`\n📱 Para acceder desde otros dispositivos:`);
      console.log(`   1. Conecta los dispositivos a la misma red WiFi`);
      console.log(`   2. En el frontend, usa: http://${localIP}:${PORT}`);
      
      // Iniciar plugin de impresión en puerto 8001
      console.log('\n🖨️  Iniciando plugin de impresión...');
      iniciarPluginImpresora();
    });
  } catch (error) {
    console.error('❌ Error al inicializar el servidor:', error);
    process.exit(1);
  }
}

startServer();

export default app;
