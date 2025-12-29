# 📦 Sistema de Inventario para Personalizaciones

## Descripción General

El sistema ahora incluye control de inventario **opcional** para las personalizaciones de productos. Esto permite gestionar items que se agotan (como ingredientes especiales, bebidas limitadas, etc.) y evita que los meseros seleccionen personalizaciones sin stock disponible.

## 🎯 Características Principales

### 1. **Control Opcional**
- Cada personalización puede activar o desactivar el control de inventario mediante un checkbox
- Si no usa inventario, funciona como antes (sin límites)
- Si usa inventario, el sistema controla las cantidades automáticamente

### 2. **Gestión de Cantidades**
- **Cantidad Inicial**: Cantidad de referencia/capacidad (ej: 100 unidades)
- **Cantidad Actual**: Stock disponible en tiempo real
- El sistema decrementa automáticamente al crear/editar comandas

### 3. **Disponibilidad Automática**
- Cuando `cantidad_actual` llega a **0**, el item se marca automáticamente como "No disponible"
- Los meseros no podrán seleccionar ese item hasta que se reponga el inventario
- Alertas visuales cuando el inventario está bajo (≤5 unidades)

## 📋 Cómo Usar

### Para Administradores

#### Activar Inventario en una Personalización

1. Ve a **Administración** → **Gestión de Personalizaciones**
2. Selecciona la categoría (ej: Bebidas, Proteínas, etc.)
3. Al crear o editar un item, activa el checkbox **"📊 Activar control de inventario"**
4. Especifica la **Cantidad Inicial** (ej: 50 unidades)
5. Guarda el item

#### Reponer Inventario

1. Ve a **Administración** → **Gestión de Personalizaciones**
2. Busca el item que necesitas reponer
3. Haz clic en **Editar** (ícono de lápiz)
4. Modifica la **Cantidad Actual** al stock disponible
5. Guarda los cambios

**Nota**: Puedes ajustar tanto `cantidad_inicial` (referencia) como `cantidad_actual` (stock real)

### Para Meseros

#### Al Crear Comandas

- Solo verás personalizaciones con stock disponible
- Si un item usa inventario y está agotado, no aparecerá en las opciones
- Verás alertas de "⚠️ X disponibles" cuando queden pocas unidades (≤5)

#### Indicadores Visuales

- **🟢 Verde**: Stock normal (>5 unidades)
- **🟡 Amarillo**: Stock bajo (≤5 unidades) - "⚠️ X disponibles"
- **🔴 Rojo**: Sin stock (0 unidades) - No aparece como opción

## 🔧 Detalles Técnicos

### Base de Datos

**Tabla**: `items_personalizacion`

```sql
-- Nuevos campos agregados
usa_inventario      INTEGER DEFAULT 0 NOT NULL  -- 0 = no usa, 1 = usa inventario
cantidad_inicial    INTEGER DEFAULT NULL        -- Cantidad de referencia
cantidad_actual     INTEGER DEFAULT NULL        -- Stock actual disponible
```

### Lógica de Negocio

1. **Al crear una comanda**:
   - El sistema valida que las personalizaciones seleccionadas tengan stock
   - Decrementa `cantidad_actual` por cada item usado
   - Si `cantidad_actual` llega a 0, marca el item como `disponible = 0`

2. **Al editar una comanda**:
   - Solo decrementa inventario de **items nuevos**
   - No afecta items que ya existían en la comanda

3. **Filtrado en frontend**:
   - `PersonalizacionProducto.tsx` filtra automáticamente items sin stock
   - Solo muestra items con `disponible = 1` Y `cantidad_actual > 0` (si usa inventario)

### Endpoints API

#### Decrementar Inventario
```
PATCH /api/personalizaciones/categorias/:categoriaId/items/:itemId/decrementar
Body: { cantidad: number }
```

Este endpoint es llamado automáticamente al crear/editar comandas.

## 📊 Ejemplo de Uso

### Caso: Bebida Especial Limitada

1. **Configuración Inicial**
   - Item: "Cerveza Artesanal Especial"
   - Usa inventario: ✅ Sí
   - Cantidad inicial: 24 (dos cajas)
   - Cantidad actual: 24

2. **Durante el Día**
   - Cliente 1 pide 2 → Quedan 22
   - Cliente 2 pide 3 → Quedan 19
   - ... 
   - Quedan 4 unidades → Aparece alerta "⚠️ 4 disponibles"
   - Cliente final pide 4 → Quedan 0

3. **Estado Final**
   - Cantidad actual: 0
   - Disponible: ❌ No (automático)
   - Los meseros ya no pueden seleccionar este item

4. **Reposición**
   - Administrador edita el item
   - Cambia cantidad actual a 24 (nueva caja)
   - Activa disponibilidad manualmente si lo desea
   - El item vuelve a estar disponible para comandas

## ⚠️ Consideraciones Importantes

1. **Items sin control de inventario**:
   - Funcionan normalmente, sin límites
   - No se ven afectados por el sistema de inventario

2. **Items con inventario**:
   - DEBEN tener una cantidad inicial al crearlos
   - El sistema validará disponibilidad antes de permitir comandas
   - Error amigable si se intenta usar un item sin stock

3. **Edición de comandas**:
   - Solo afecta inventario de items NUEVOS
   - No revierte inventario de items eliminados (para evitar duplicaciones)

4. **Transacciones**:
   - Todo el proceso (crear comanda + decrementar inventario) es transaccional
   - Si falla alguna parte, se revierte todo el cambio

## 🚀 Beneficios

✅ **Control real del stock** de items especiales o limitados
✅ **Evita errores** al tomar pedidos de items agotados
✅ **Alertas proactivas** cuando el stock está bajo
✅ **Actualización automática** sin intervención manual
✅ **Opcional y flexible** - cada item decide si lo usa o no
✅ **Interfaz intuitiva** con indicadores visuales claros

## 📝 Notas de Migración

La migración se ejecutó automáticamente y agregó los campos necesarios:
```bash
npx ts-node src/database/migration-inventario-personalizaciones.ts
```

**Todos los items existentes**:
- `usa_inventario = 0` (no usan inventario por defecto)
- `cantidad_inicial = NULL`
- `cantidad_actual = NULL`
- Siguen funcionando normalmente sin cambios

---

**Fecha de implementación**: 29 de diciembre de 2025
**Versión**: 1.0.0
