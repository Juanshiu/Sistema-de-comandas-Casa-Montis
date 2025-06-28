# Sistema de Comandas - Casa Montis

Sistema integral de comandas para el restaurante Casa Montis, desarrollado con React/Next.js en el frontend y Node.js/Express en el backend, con impresión térmica automática.

## 🚀 Características

### Frontend (React + Next.js + Tailwind)
- **Formulario por pasos**: Navegación intuitiva para crear comandas
- **Selección de mesa**: Visualización del estado de ocupación de mesas
- **Categorización de productos**: 
  - Desayunos (con precios especiales)
  - Almuerzos (sopa, principio, proteína)
  - Especialidades a la carta (pechugas, carnes, pastas, pescados, arroces)
  - Sopas individuales
  - Bebidas
  - Productos de cafetería
  - Porciones adicionales
- **Diseño responsive**: Funciona en tablets, celulares y PCs
- **Interfaz moderna**: UI atractiva y fácil de usar

### Backend (Node.js + Express + SQLite)
- **API RESTful**: Endpoints para mesas, productos y comandas
- **Base de datos SQLite**: Ligera y eficiente para un solo punto
- **Impresión térmica**: Integración con impresoras USB
- **Control de mesas**: Gestión automática del estado de ocupación
- **Transacciones**: Consistencia de datos garantizada

### Sistema de Impresión
- **Impresión automática**: Las comandas se imprimen automáticamente en cocina
- **Formato optimizado**: Tickets claros y legibles
- **Fallback a consola**: Si no hay impresora disponible, muestra en consola
- **Soporte para facturas**: Impresión de facturas para caja

## 📁 Estructura del Proyecto

```
Sistema-comandas/
├── frontend/                 # React + Next.js
│   ├── src/
│   │   ├── app/             # App Router de Next.js
│   │   ├── components/      # Componentes React
│   │   ├── types/           # Tipos TypeScript
│   │   └── services/        # Servicios de API
│   ├── package.json
│   └── tailwind.config.js
├── backend/                 # Node.js + Express
│   ├── src/
│   │   ├── database/        # Configuración SQLite
│   │   ├── models/          # Tipos y modelos
│   │   ├── routes/          # Rutas de API
│   │   └── services/        # Servicios (impresión)
│   ├── package.json
│   └── .env
└── README.md
```

## 🛠️ Instalación y Configuración

### Requisitos Previos
- Node.js 18+ 
- npm o yarn
- (Opcional) Impresora térmica USB compatible

### Instalación Automática

```bash
# Dar permisos de ejecución al script
chmod +x setup.sh

# Ejecutar instalación
./setup.sh
```

### Instalación Manual

1. **Backend**:
```bash
cd backend
npm install
npm run build
```

2. **Frontend**:
```bash
cd frontend
npm install
```

### Configuración de Impresoras

Edita el archivo `backend/.env`:

```env
PORT=3001
DB_PATH=./database/casa_montis.db
PRINTER_COCINA_NAME=POS-80-Series
PRINTER_CAJA_NAME=POS-80-Series
NODE_ENV=development
```

## 🚀 Ejecución

### Modo Desarrollo

1. **Iniciar Backend**:
```bash
cd backend
npm run dev
```

2. **Iniciar Frontend** (en otra terminal):
```bash
cd frontend
npm run dev
```

### Acceso al Sistema
- **Frontend**: http://localhost:3000
- **API Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📊 API Endpoints

### Mesas
- `GET /api/mesas` - Obtener todas las mesas
- `GET /api/mesas/:id` - Obtener mesa específica
- `PATCH /api/mesas/:id` - Actualizar estado de mesa

### Productos
- `GET /api/productos` - Obtener todos los productos
- `GET /api/productos/categoria/:categoria` - Productos por categoría
- `POST /api/productos` - Crear producto
- `PUT /api/productos/:id` - Actualizar producto

### Comandas
- `GET /api/comandas` - Obtener todas las comandas
- `GET /api/comandas/:id` - Obtener comanda específica
- `POST /api/comandas` - Crear nueva comanda
- `PATCH /api/comandas/:id/estado` - Actualizar estado
- `POST /api/comandas/:id/imprimir` - Imprimir comanda
- `DELETE /api/comandas/:id` - Eliminar comanda

## 💡 Flujo de Trabajo

1. **Seleccionar Mesa**: El mesero elige una mesa disponible
2. **Tipo de Servicio**: Selecciona categoría (desayuno, almuerzo, carta, etc.)
3. **Productos**: Agrega productos con cantidades y observaciones
4. **Resumen**: Revisa la comanda y agrega observaciones generales
5. **Envío**: La comanda se guarda y se imprime automáticamente en cocina
6. **Cocina**: Prepara los pedidos según las comandas impresas
7. **Entrega**: Marca la comanda como entregada y libera la mesa

## 🔧 Personalización

### Agregar Productos
Los productos se pueden agregar directamente en la base de datos o crear endpoints de administración.

### Configurar Mesas
El sistema inicializa con 16 mesas por defecto. Se pueden agregar más desde la base de datos.

### Precios Especiales
Los desayunos y almuerzos pueden tener configuraciones de precios especiales según la combinación de productos.

## 🖨️ Configuración de Impresoras

### Impresoras Compatibles
- Epson TM-T20
- Xprinter XP-80
- POS-80 Series
- Cualquier impresora térmica con driver ESC/POS

### Conexión USB
1. Conectar impresora vía USB
2. Verificar que el sistema detecte la impresora
3. Configurar nombre en `.env`

### Solución de Problemas
- Si no detecta la impresora, las comandas se mostrarán en consola
- Verificar permisos USB en Linux
- Instalar drivers específicos si es necesario

## 📱 Uso en Dispositivos

### Tablets
- Interfaz optimizada para tablets de 10"
- Navegación touch-friendly
- Formularios grandes y claros

### Celulares
- Diseño responsive que se adapta a pantallas pequeñas
- Botones grandes para fácil navegación
- Scrolling optimizado

### PCs
- Aprovecha pantallas grandes para mostrar más información
- Ideal para estaciones de caja
- Navegación con teclado compatible

## 🔐 Seguridad

- Headers de seguridad con Helmet
- Validación de datos en todas las rutas
- Transacciones de base de datos para consistencia
- Manejo de errores robusto

## 📈 Escalabilidad

El sistema está diseñado para un solo punto (SQLite), pero puede escalarse:

- **Múltiples puntos**: Cambiar a PostgreSQL/MySQL
- **Sincronización**: Implementar replicación de base de datos
- **Usuarios**: Agregar sistema de autenticación
- **Reportes**: Módulo de reportes y analíticas

## 🤝 Contribuir

Para contribuir al proyecto:
1. Fork el repositorio
2. Crear branch para feature
3. Implementar cambios
4. Agregar tests si es necesario
5. Crear pull request

## 📄 Licencia

Proyecto propietario para Casa Montis.

## 📞 Soporte

Para soporte técnico contactar al desarrollador del sistema.
