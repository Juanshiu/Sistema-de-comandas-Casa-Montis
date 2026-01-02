# Sistema de Pedidos a Domicilio y Para Llevar

## Descripción General
Se ha implementado un sistema completo para manejar pedidos a domicilio y para llevar, además de los pedidos tradicionales en mesa.

## Nuevas Funcionalidades

### 1. Tipos de Pedido
El sistema ahora soporta 3 tipos de pedido:
- **Mesa**: Pedido tradicional para consumo en el restaurante
- **Domicilio**: Pedido que se entrega en la dirección del cliente
- **Para Llevar**: Cliente recoge el pedido en el restaurante

### 2. Flujo de Toma de Comandas

#### Paso 1: Selección de Tipo de Pedido
- El usuario primero elige entre "Mesa" o "Domicilio/Para Llevar"
- Interfaz visual con iconos distintivos

#### Paso 2A: Si es Mesa
- Selecciona las mesas del restaurante
- Ingresa el nombre del mesero
- (Flujo original sin cambios)

#### Paso 2B: Si es Domicilio
- **Nombre del Cliente** (obligatorio)
- **Teléfono** (obligatorio para domicilio, opcional para llevar)
- **Dirección** (obligatorio solo si NO es para llevar)
- **Checkbox "Para Llevar"**: Si está marcado, el cliente recoge en el restaurante
- **Mesero/Responsable** (obligatorio)

#### Paso 3: Tipo de Servicio
- (Sin cambios - desayuno, almuerzo, carta, etc.)

#### Paso 4: Selección de Productos
- (Sin cambios)

#### Paso 5: Resumen y Envío
- Muestra los datos del cliente en lugar de mesas cuando es domicilio
- Valida que estén todos los datos necesarios

### 3. Visualización en Interfaz de Caja

Las comandas de domicilio se muestran diferenciadas:
- **Icono 🚚** para domicilios
- **Icono 🛍️** para pedidos para llevar
- **Nombre del cliente** en lugar de número de mesa
- **Teléfono** visible para contacto
- **Dirección** visible (solo si es domicilio)
- **Etiqueta "Cliente recoge"** visible (solo si es para llevar)

### 4. Impresión de Comandas

Las comandas ahora se imprimen con el formato apropiado:

**Para Mesa:**
```
Fecha: 21/12/2024
Hora:  14:30
Mesero: Juan Pérez
Mesa(s): Principal-5
```

**Para Domicilio:**
```
Fecha: 21/12/2024
Hora:  14:30
Mesero: Juan Pérez

*** DOMICILIO ***

Cliente: María González
Tel: 3123456789
Direccion:
  Cra 10 #20-30
  Barrio Centro
```

**Para Llevar:**
```
Fecha: 21/12/2024
Hora:  14:30
Mesero: Juan Pérez

*** PARA LLEVAR ***

Cliente: Carlos Rodríguez
Tel: 3109876543
```

## Cambios Técnicos

### Base de Datos
Se agregaron los siguientes campos a la tabla `comandas`:
- `tipo_pedido` (TEXT): 'mesa' o 'domicilio'
- `cliente_nombre` (TEXT): Nombre del cliente
- `cliente_direccion` (TEXT): Dirección de entrega
- `cliente_telefono` (TEXT): Teléfono de contacto
- `es_para_llevar` (BOOLEAN): 1 si es para llevar, 0 si es domicilio

### Frontend

#### Nuevos Componentes
1. **SeleccionTipoPedido.tsx**
   - Permite elegir entre Mesa o Domicilio
   - Interfaz visual con cards grandes y iconos

2. **FormularioDatosCliente.tsx**
   - Captura datos del cliente
   - Checkbox para "Para Llevar"
   - Validaciones dinámicas según el tipo

#### Componentes Modificados
1. **FormularioComandas.tsx**
   - Ahora tiene 5 pasos en lugar de 4
   - Lógica condicional para mostrar formulario de mesa o cliente
   - Validaciones según tipo de pedido

2. **ResumenComanda.tsx**
   - Muestra información de cliente o mesa según corresponda
   - Validaciones adaptadas al tipo de pedido

3. **InterfazCaja.tsx**
   - Lista de comandas con iconos distintivos
   - Panel de detalle muestra datos del cliente
   - Información adaptada al tipo de pedido

### Backend

#### Modelos (types)
Se agregaron las interfaces:
- `DatosCliente`: nombre, direccion, telefono, es_para_llevar
- Se actualizó `Comanda` y `CreateComandaRequest` con los nuevos campos

#### API (comandas-nuevas.ts)
- **POST /**
  - Validaciones condicionales según tipo de pedido
  - No intenta insertar relaciones mesa-comanda si es domicilio
  - No marca mesas como ocupadas si es domicilio
  - Guarda datos del cliente

- **GET /activas**
  - Retorna datos de cliente cuando es domicilio
  - No intenta cargar mesas si tipo_pedido = 'domicilio'

#### Impresión (printer.ts)
- `crearArchivoComanda()`: Detecta tipo de pedido e imprime formato apropiado
- `crearArchivoItemsAdicionales()`: Adaptado para domicilios

## Migración de Base de Datos

Se ejecutó el script `migration-domicilios.ts` que:
1. Verifica si las columnas ya existen
2. Agrega las columnas nuevas usando ALTER TABLE
3. Establece valores por defecto para compatibilidad con datos existentes

**Estado**: ✅ Migración ejecutada exitosamente

## Flujo de Uso

### Para crear un pedido a domicilio:
1. Ir a "Tomar Comandas"
2. Seleccionar "Domicilio / Para Llevar"
3. Ingresar datos del cliente
4. **Si es para llevar**: Marcar el checkbox
5. **Si es domicilio**: Llenar la dirección completa
6. Continuar con selección de productos
7. Enviar comanda

### Para procesar el pago:
1. Ir a "Interfaz de Caja"
2. Las comandas de domicilio aparecen con 🚚 o 🛍️
3. Seleccionar la comanda
4. Ver datos del cliente en el panel derecho
5. Procesar pago normalmente
6. Al imprimir recibo, aparecen los datos del cliente

## Compatibilidad

- ✅ Las comandas antiguas (sin tipo_pedido) se tratan como 'mesa' por defecto
- ✅ El sistema continúa funcionando normalmente para pedidos en mesa
- ✅ La impresión detecta automáticamente el tipo y usa el formato correcto
- ✅ No se rompe funcionalidad existente

## Notas Importantes

1. **Validación de Teléfono**: Es obligatorio para domicilios, opcional para llevar
2. **Validación de Dirección**: Solo obligatoria si NO es para llevar
3. **Mesas en Domicilio**: Las comandas de domicilio tienen array vacío de mesas
4. **Impresión**: Se adapta automáticamente al tipo de pedido
5. **Facturación**: Funciona igual para todos los tipos de pedido

## Próximas Mejoras Sugeridas

- [ ] Agregar campo "Observaciones de entrega" específico para domicilios
- [ ] Implementar cálculo automático de costo de domicilio
- [ ] Agregar estado "En camino" para domicilios
- [ ] Mapa o integración con GPS para rutas de entrega
- [ ] Historial de direcciones por cliente
- [ ] Tiempo estimado de entrega
- [ ] Notificaciones al cliente (SMS/WhatsApp)
