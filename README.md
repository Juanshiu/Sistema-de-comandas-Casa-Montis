# Sistema de Comandas - Casa Montis

Sistema integral de comandas para el restaurante Casa Montis, desarrollado con React/Next.js en el frontend y Node.js/Express en el backend, con impresión térmica automática y soporte completo para pedidos en mesa y a domicilio.

## 🚀 Características Principales

### 🍽️ Gestión de Pedidos Multi-canal
- **Pedidos en Mesa**: Sistema tradicional con selección de mesa y mesero
- **Pedidos a Domicilio**: Con captura de datos del cliente (nombre, dirección, teléfono)
- **Pedidos para Llevar**: Modalidad express sin dirección de entrega
- **Flujo Condicional**: UI adaptativa según el tipo de pedido seleccionado

### 💼 Frontend (React + Next.js + Tailwind)
- **Formulario por pasos (5 steps)**:
  1. Selección de tipo de pedido (Mesa/Domicilio/Para Llevar)
  2. Datos de mesa o cliente (según tipo)
  3. Tipo de servicio (Desayuno/Almuerzo/Carta)
  4. Selección de productos con personalización
  5. Resumen y confirmación con observaciones

- **Categorización de productos**: 
  - Desayunos (con precios especiales)
  - Almuerzos (sopa, principio, proteína)
  - Especialidades a la carta (pechugas, carnes, pastas, pescados, arroces)
  - Sopas individuales
  - Bebidas
  - Productos de cafetería
  - Porciones adicionales

- **Gestión de Comandas**:
  - Visualización de comandas activas
  - Historial completo con filtros
  - Edición de comandas existentes (agregar items adicionales)
  - Estados: Pendiente, Preparando, Lista, Entregada, Cancelada

- **Interfaz de Caja**:
  - Procesamiento de facturas
  - Métodos de pago: Efectivo, Tarjeta, Transferencia, Mixto
  - Cálculo automático de cambio
  - Impresión de recibos

- **Diseño responsive**: Funciona en tablets, celulares y PCs
- **Interfaz moderna**: UI atractiva y fácil de usar con Lucide Icons

### ⚙️ Backend (Node.js + Express + SQLite + TypeScript)
- **API RESTful Completa**: 
  - CRUD de mesas, productos, comandas y salones
  - Validación condicional según tipo de pedido
  - Gestión de personalizaciones dinámicas
  - Sistema de facturas

- **Base de datos SQLite**: 
  - Ligera y eficiente para un solo punto
  - Soporte para múltiples mesas por comanda
  - Campos adicionales para domicilios (tipo_pedido, cliente_nombre, cliente_direccion, cliente_telefono, es_para_llevar)
  - Historial completo de comandas

- **Control de mesas**: 
  - Gestión automática del estado de ocupación
  - Liberación automática al facturar
  - Organización por salones

- **Transacciones**: Consistencia de datos garantizada

### � Gestión de Recursos Humanos (Nómina y Personal)
- **Gestión de Empleados**: 
  - CRUD completo de personal con datos detallados (cargo, contrato, salario, etc.)
  - Control de estados y tipos de trabajadores
- **Liquidación de Nómina**:
  - Cálculo automático de devengados (horas extra, dominicales, festivos, comisiones)
  - Deducciones automáticas (salud, pensión) y aportes de ley
  - Generación de periodos mensuales y quincenales
- **Liquidación de Prestaciones Sociales**:
  - Cálculo de cesantías, intereses, primas y vacaciones
  - Soporte para diferentes motivos de retiro (renuncia, despido con/sin justa causa)
  - Historial detallado de liquidaciones con trazabilidad

### 🖨️ Sistema de Impresión Profesional
- **Plugin HTTP Propio** (Puerto 8001):
  - Sin marcas de agua ni dependencias externas
  - Soporte nativo para impresoras térmicas ESC/POS
  - Encoding CP850 optimizado para caracteres españoles (tildes, ñ)
  - Comandos ESC/POS nativos para control total

- **Impresión Inteligente**:
  - **Comandas iniciales**: Impresión automática completa
  - **Items adicionales**: Solo imprime productos nuevos agregados
  - **Formato diferenciado**: Marca visual para items adicionales urgentes
  - **Sin duplicados**: Filtro automático de items ya impresos

- **Formatos Optimizados**:
  - Comandas de cocina (58mm)
  - Facturas de caja
  - Recibos de pago
  - Soporte para domicilios con dirección completa

- **Caracteres Especiales**:
  - Tildes correctas: á, é, í, ó, ú, Á, É, Í, Ó, Ú
  - Eñes: ñ, Ñ
  - Signos especiales: ¿, ¡, $, €

- **Fallback robusto**: Impresión en consola si falla hardware

## 📁 Estructura del Proyecto

```
Sistema-comandas/
├── frontend/                 # React + Next.js
│   ├── src/
│   │   ├── app/             # App Router de Next.js
│   │   │   ├── page.tsx     # Página principal
│   │   │   └── historial/   # Página de historial
│   │   ├── components/      # Componentes React
│   │   │   ├── SistemaPrincipal.tsx         # Componente raíz
│   │   │   ├── FormularioComandas.tsx       # Wizard de 5 pasos
│   │   │   ├── SeleccionTipoPedido.tsx      # Mesa/Domicilio/Llevar
│   │   │   ├── SeleccionMesaNueva.tsx       # Selector de mesas
│   │   │   ├── FormularioDatosCliente.tsx   # Datos para domicilio
│   │   │   ├── SeleccionTipoServicio.tsx    # Desayuno/Almuerzo/Carta
│   │   │   ├── SeleccionProductos.tsx       # Catálogo de productos
│   │   │   ├── ResumenComanda.tsx           # Vista previa y envío
│   │   │   ├── InterfazCaja.tsx             # Procesamiento de pagos
│   │   │   ├── HistorialComandas.tsx        # Historial completo
│   │   │   └── admin/                       # Componentes de administración
│   │   ├── types/           # Tipos TypeScript
│   │   └── services/        # Servicios de API
│   ├── package.json
│   └── tailwind.config.js
├── backend/                 # Node.js + Express
│   ├── src/
│   │   ├── database/        # Configuración SQLite y migraciones
│   │   ├── models/          # Tipos y modelos
│   │   ├── routes/          # Rutas de API
│   │   │   ├── comandas-nuevas.ts  # API de comandas (ACTIVA)
│   │   │   ├── facturas-nuevas.ts  # API de facturas
│   │   │   ├── mesas.ts            # API de mesas
│   │   │   ├── productos.ts        # API de productos
│   │   │   ├── salones.ts          # API de salones
│   │   │   ├── empleados.ts        # API de empleados (RRHH)
│   │   │   └── nomina.ts           # API de nómina y liquidaciones
│   │   └── services/        # Servicios
│   │       ├── printer.ts           # Servicio de impresión principal
│   │       └── pluginImpresora.ts   # Plugin HTTP propio (Puerto 8001)
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
ESC_POS_URL=http://localhost:8001/imprimir
PRINTER_COCINA_NAME=pos58
PRINTER_CAJA_NAME=pos58
NODE_ENV=development
```

**Nota**: El sistema inicia automáticamente el plugin de impresión en el puerto 8001. No necesita software adicional.

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

### Salones
- `GET /api/salones` - Obtener todos los salones
- `POST /api/salones` - Crear nuevo salón
- `PUT /api/salones/:id` - Actualizar salón
- `DELETE /api/salones/:id` - Eliminar salón

### Productos
- `GET /api/productos` - Obtener todos los productos
- `GET /api/productos/categoria/:categoria` - Productos por categoría
- `POST /api/productos` - Crear producto
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto

### Comandas
- `GET /api/comandas` - Obtener todas las comandas
- `GET /api/comandas/activas` - Obtener comandas activas (con items)
- `GET /api/comandas/historial` - Obtener historial completo
- `GET /api/comandas/:id` - Obtener comanda específica (con items)
- `POST /api/comandas` - Crear nueva comanda (imprime automáticamente)
- `PUT /api/comandas/:id` - Agregar items adicionales a comanda existente
- `PATCH /api/comandas/:id/estado` - Actualizar estado de comanda
- `DELETE /api/comandas/:id` - Eliminar comanda y liberar mesas

### Facturas
- `GET /api/facturas` - Obtener todas las facturas
- `GET /api/facturas/:id` - Obtener factura específica
- `POST /api/facturas` - Crear factura y liberar mesa
- `POST /api/facturas/:id/imprimir` - Reimprimir factura

### Recursos Humanos (RRHH)
- `GET /api/empleados` - Listar todos los empleados
- `POST /api/empleados` - Registrar nuevo empleado
- `GET /api/nomina/configuracion` - Obtener configuración de ley vigente
- `POST /api/nomina/calcular` - Calcular nómina para un empleado
- `POST /api/nomina/liquidar` - Calcular liquidación definitiva de prestaciones

### Personalizaciones
- `GET /api/personalizaciones/categorias` - Obtener categorías de personalización
- `POST /api/personalizaciones/categorias` - Crear categoría
- `GET /api/personalizaciones/opciones` - Obtener opciones por categoría
- `POST /api/personalizaciones/opciones` - Crear opción

### Plugin de Impresión (Puerto 8001)
- `POST /imprimir` - Imprimir contenido con encoding CP850
- `POST /probar` - Probar impresora con texto de ejemplo
- `GET /status` - Estado del servicio de impresión

## 💡 Flujo de Trabajo Detallado

### 🍽️ Pedidos en Mesa

1. **Selección de Tipo**: Usuario elige "Mesa"
2. **Selección de Mesa(s)**: Se pueden asignar múltiples mesas a una misma comanda
3. **Tipo de Servicio**: Desayuno, Almuerzo, o Carta Completa
4. **Selección de Productos**:
   - Desayuno: Formulario especializado con personalizaciones (bebidas, panes, acompañamientos)
   - Almuerzo: Formulario con opciones de entrada, principal, acompañamientos, postre
   - Carta Completa: Selección libre de cualquier producto del menú
5. **Resumen y Envío**: Vista previa con todas las opciones seleccionadas
6. **Impresión Automática**: Comanda se imprime en cocina automáticamente

### 🏠 Pedidos a Domicilio / Para Llevar

1. **Selección de Tipo**: Usuario elige "Domicilio"
2. **Datos del Cliente**:
   - Nombre (requerido)
   - Dirección (requerida para delivery, opcional para pickup)
   - Teléfono (opcional)
   - Checkbox "¿Es para llevar?" (si se marca, no se requiere dirección)
3. **Tipo de Servicio**: Igual que mesa
4. **Selección de Productos**: Igual que mesa
5. **Resumen y Envío**: Muestra datos del cliente en lugar de mesas
6. **Impresión**: Ticket incluye claramente datos del cliente y dirección

### ✏️ Edición de Comandas

1. **Acceso**: Desde historial o lista de comandas activas
2. **Agregar Items**: Se pueden agregar productos adicionales a una comanda existente
3. **Filtrado Inteligente**: Sistema detecta automáticamente qué items son nuevos
   - Identifica items sin ID o con ID temporal (prefijo `temp_`)
   - Verifica formato UUID para distinguir items existentes
   - Solo inserta items nuevos en base de datos
4. **Impresión Selectiva**: Solo imprime los items adicionales
   - Header especial: "** PRODUCTOS ADICIONALES **"
   - Incluye ID de comanda y referencia a mesa/cliente
   - No reimprime items existentes
5. **Sin Duplicados**: Sistema previene duplicación de items en DB y ticket

### 💰 Interface de Caja

1. **Selección de Comanda**: Ver todas las comandas activas con totales
2. **Generación de Factura**: Cálculo automático de totales con IVA
3. **Métodos de Pago**:
   - Efectivo (con cálculo automático de cambio)
   - Tarjeta
   - Transferencia
   - Mixto (efectivo + otro método)
4. **Impresión de Recibo**: Ticket de pago para el cliente
5. **Liberación Automática**: Mesas quedan disponibles tras facturar

### 🖨️ Sistema de Impresión

El sistema utiliza un **plugin HTTP propio** que garantiza la impresión correcta de caracteres especiales del español:

**Características del Plugin:**
- **Puerto dedicado**: 8001 (separado del backend principal)
- **Encoding**: CP850 (Code Page 850)
- **Comando ESC/POS**: `ESC t 2` (selecciona tabla de caracteres CP850)
- **Soporte completo**: á é í ó ú Á É Í Ó Ú ñ Ñ ¿ ¡
- **Sin marcas de agua** ni limitaciones de software externo
- **Transmisión binaria**: `copy /b` preserva bytes exactos
- **Auto-inicio**: Se inicia automáticamente con el backend

**Tipos de Impresión:**
- **Comanda Completa**: Imprime todos los items de una comanda nueva
- **Items Adicionales**: Solo imprime items agregados en edición
- **Factura**: Ticket de pago con totales y método de pago
- **Recibo**: Copia para el cliente

**Ejemplo de Formato:**
```
=========================================
         CASA MONTIS
=========================================
Fecha: 21/12/2024 14:30
Comanda #123
Mesa: 5 - Salón Principal
Mesero: Juan Pérez
-----------------------------------------
DESAYUNO
-----------------------------------------
1x Jugo Natural - Naranja      $5.00
1x Pan Francés
   ├─ Mermelada de fresa
   └─ Mantequilla
   Subtotal:                    $3.50
-----------------------------------------
TOTAL:                          $8.50
=========================================
```

**Para Domicilio:**
```
=========================================
         CASA MONTIS
      PEDIDO A DOMICILIO
=========================================
Comanda #124
Cliente: María García
Dirección: Calle Principal #123
Teléfono: 555-1234
-----------------------------------------
[... productos ...]
=========================================
```

## 🔧 Personalización y Administración

### Panel de Administración

El sistema incluye un panel completo de administración accesible desde la interfaz principal:

**Gestión de Productos:**
- Crear, editar y eliminar productos
- Organizar por categorías
- Establecer precios
- Marcar disponibilidad

**Gestión de Mesas:**
- Configurar número de mesas por salón
- Establecer capacidad
- Reorganizar distribución
- Ver estado en tiempo real

**Gestión de Salones:**
- Crear múltiples salones (Terraza, Interior, VIP, etc.)
- Asignar mesas a cada salón
- Configurar capacidades

**Gestión de Personalizaciones:**
- Configurar opciones para Desayunos (jugos, panes, acompañamientos)
- Configurar opciones para Almuerzos (entradas, principales, postres)
- Crear categorías personalizadas
- Establecer precios adicionales

### Base de Datos

**Esquema Principal:**
- `comandas`: Pedidos con soporte multi-canal (mesa/domicilio)
  - `tipo_pedido`: 'mesa' | 'domicilio'
  - `cliente_nombre`, `cliente_direccion`, `cliente_telefono`
  - `es_para_llevar`: booleano para pickup
- `comanda_items`: Productos de cada comanda
- `comanda_mesas`: Relación muchos-a-muchos comandas-mesas
- `mesas`: Estado y configuración de mesas
- `salones`: Organización de espacios
- `productos`: Catálogo completo
- `facturas`: Registro de pagos
- `personalizaciones_categorias` y `personalizaciones_opciones`

### Historial y Reportes

**Historial de Comandas:**
- Ver todas las comandas (activas y completadas)
- Filtrar por fecha, tipo, estado
- Ver detalles completos con items y totales
- Editar comandas existentes (agregar items)

**Reportes (Próximamente):**
- Ventas por período
- Productos más vendidos
- Análisis por tipo de servicio
- Reporte de domicilios vs mesas

## 🖨️ Configuración Avanzada de Impresoras

### Sistema de Impresión Propio

El sistema incluye un plugin HTTP completamente autónomo:

**Características Técnicas:**
- **Archivo**: `backend/src/services/pluginImpresora.ts`
- **Puerto**: 8001 (configurable)
- **Protocolo**: HTTP POST con body en texto plano
- **Encoding**: CP850 (Code Page 850) - Estándar para español
- **Sin dependencias externas**: No requiere software de terceros

**Comandos ESC/POS Soportados:**
- `ESC @`: Reset de impresora
- `ESC t 2`: Seleccionar tabla CP850
- `ESC E 1/0`: Negrita on/off
- `ESC a 0/1/2`: Alineación izq/centro/der
- `ESC d n`: Avanzar n líneas
- `GS V 66 0`: Cortar papel

**Encodings Disponibles:**
- `cp850`: Latin 1 (español) - **RECOMENDADO**
- `latin1`: ISO-8859-1
- `cp437`: US ASCII extendido
- `utf-8`: Unicode (requiere impresora compatible)

### Impresoras Compatibles

Cualquier impresora térmica de 58mm o 80mm con soporte ESC/POS:
- Epson TM-T20, TM-T88
- Xprinter XP-58, XP-80
- Bixolon SRP-350
- Star Micronics TSP143
- POS-58 (genéricas chinas)

### Configuración Windows

1. **Conectar impresora vía USB**
2. **Instalar drivers** (Windows normalmente los detecta automáticamente)
3. **Identificar nombre**: Panel de Control → Dispositivos e impresoras
4. **Configurar en .env**:
```env
PRINTER_COCINA_NAME=pos58
```

**Nota**: El nombre debe coincidir EXACTAMENTE con el que aparece en Windows.

### Solución de Problemas de Impresión

**La impresora no imprime:**
- Verificar que está encendida y conectada
- Confirmar nombre en .env coincide con Windows
- Ver logs del plugin en puerto 8001: `http://localhost:8001/status`
- Probar endpoint de prueba: `POST http://localhost:8001/probar`

**Caracteres raros o basura:**
- Verificar encoding en .env (debe ser `cp850`)
- Confirmar que impresora soporta CP850 (mayoría sí lo hace)
- Reiniciar backend para aplicar cambios de configuración

**No corta el papel:**
- Algunas impresoras requieren configuración de auto-corte
- Verificar comando GS V en código si es necesario
- Puede requerir ajuste manual del comando de corte

**Duplicados o items repetidos:**
- Ya resuelto: sistema tiene filtrado inteligente
- Solo imprime items nuevos al editar
- Verifica logs para confirmar comportamiento

## 📱 Uso en Dispositivos

### Tablets (Recomendado)
- **Resolución óptima**: 1280x800 o superior
- **Sistema**: Android 8+ o iPad OS
- **Navegador**: Chrome, Safari, Edge
- **Experiencia**: Interfaz touch-friendly, botones grandes
- **Ideal para**: Meseros tomando órdenes

### Celulares
- **Compatibilidad**: Diseño 100% responsive
- **Pantallas**: Desde 375px de ancho
- **Limitaciones**: Menos información visible simultáneamente
- **Ideal para**: Consultas rápidas, toma de pedidos simple

### PCs / Laptops
- **Pantallas grandes**: Aprovecha espacio para mostrar más datos
- **Navegación**: Teclado y mouse optimizados
- **Ideal para**: Estaciones de caja, administración, reportes
- **Impresión**: Conexión directa a impresoras USB

### Recomendaciones de Hardware

**Para Meseros:**
- Tablet Android 10" (ej: Samsung Tab A)
- Funda protectora con soporte
- Batería externa si jornadas largas

**Para Caja:**
- PC o Laptop Windows 10+
- Impresora térmica 80mm USB
- Monitor táctil opcional

**Para Cocina:**
- PC compacta o Laptop vieja
- Impresora térmica 58mm o 80mm
- Soporte para colgar tickets

## 🔐 Seguridad y Mejores Prácticas

**Implementado:**
- Headers de seguridad con Helmet
- Validación de datos en todas las rutas
- Transacciones SQLite para integridad de datos
- Manejo robusto de errores con logs detallados
- Sanitización de inputs

**Recomendaciones Futuras:**
- Implementar autenticación JWT para usuarios
- Agregar roles (mesero, cajero, admin)
- Backup automático de base de datos
- HTTPS en producción
- Rate limiting en endpoints

## 📈 Escalabilidad y Roadmap

### Estado Actual
- ✅ SQLite para punto único
- ✅ Soporte multi-mesa y multi-salón
- ✅ Sistema multi-canal (mesa/domicilio)
- ✅ Edición de comandas sin duplicados
- ✅ Impresión con encoding perfecto

### Próximas Funcionalidades
- 🔄 Autenticación y gestión de usuarios
- 🔄 Reportes y analíticas avanzadas
- 🔄 Integración con delivery apps (Uber Eats, Rappi)
- 🔄 App móvil nativa (React Native)
- 🔄 Sistema de inventario
- 🔄 CRM de clientes frecuentes

### Escalabilidad Multi-Punto
Para cadenas con múltiples sucursales:
1. Migrar a PostgreSQL/MySQL
2. Implementar replicación maestro-esclavo
3. API Gateway central
4. Sincronización en tiempo real con WebSockets
5. Dashboard corporativo consolidado

## 🤝 Contribuir y Desarrollo

### Estructura de Branches
- `main`: Producción estable
- `develop`: Desarrollo activo
- `feature/*`: Nuevas funcionalidades
- `fix/*`: Correcciones de bugs

### Flujo de Contribución
1. Fork el repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Implementar cambios con commits descriptivos
4. Agregar tests si aplica
5. Crear Pull Request con descripción detallada

### Standards de Código
- **TypeScript**: Strict mode activado
- **ESLint**: Configuración estándar
- **Prettier**: Formateo automático
- **Commits**: Conventional Commits (feat:, fix:, docs:)

## 📄 Licencia y Soporte

**Licencia**: Proyecto propietario para Casa Montis.

**Soporte Técnico:**
- Documentación completa en este README
- Logs detallados en consola del backend
- Sistema de health check: `http://localhost:3001/health`

**Contacto**: Para consultas o soporte, contactar al desarrollador del sistema.
