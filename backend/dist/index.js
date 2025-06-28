"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const init_1 = require("./database/init");
const update_1 = require("./database/update");
const mesas_1 = __importDefault(require("./routes/mesas"));
const productos_1 = __importDefault(require("./routes/productos"));
const comandas_1 = __importDefault(require("./routes/comandas"));
const facturas_1 = __importDefault(require("./routes/facturas"));
const reportes_1 = __importDefault(require("./routes/reportes"));
// Cargar variables de entorno
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Rutas de API
app.use('/api/mesas', mesas_1.default);
app.use('/api/productos', productos_1.default);
app.use('/api/comandas', comandas_1.default);
app.use('/api/facturas', facturas_1.default);
app.use('/api/reportes', reportes_1.default);
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
app.use((err, req, res, next) => {
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
        await (0, init_1.initDatabase)();
        console.log('✅ Base de datos inicializada');
        // Actualizar con productos y mesas reales
        await (0, update_1.updateDatabaseWithProducts)();
        console.log('✅ Datos actualizados');
        app.listen(PORT, () => {
            console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
            console.log(`🏥 Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('❌ Error al inicializar el servidor:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map