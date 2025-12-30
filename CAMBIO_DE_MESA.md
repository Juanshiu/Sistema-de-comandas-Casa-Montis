# 🔄 Cambio de Mesa para Comandas Activas

## Descripción

Funcionalidad que permite transferir una comanda activa de una mesa a otra(s) de forma rápida y segura, ideal para cuando los clientes deciden cambiarse de mesa después de realizar su pedido.

## 🎯 Caso de Uso

**Escenario típico:**
1. Cliente se sienta en Mesa 1
2. Mesero toma el pedido y crea la comanda
3. Cliente decide cambiarse a Mesa 5 (más grande/mejor ubicación)
4. Mesero usa "Cambiar Mesa" → Selecciona Mesa 5 → Confirma
5. La comanda ahora está asociada a Mesa 5
6. Mesa 1 queda liberada automáticamente

## 📍 Ubicación en la UI

**Frontend**: En la sección "Comandas Activas para Editar" de la pantalla inicial
- Solo visible para comandas de tipo **mesa** (no domicilios)
- Botón naranja **"🔄 Cambiar Mesa"** junto al botón azul de "Editar"

## 🔧 Cómo Usar

### Para Meseros:

1. **Encontrar la comanda**
   - En la pantalla inicial, scroll hasta "Comandas Activas para Editar"
   - Ubica la comanda que necesitas mover

2. **Iniciar cambio**
   - Haz clic en el botón **"🔄 Cambiar Mesa"** (naranja)
   - Se abre un modal mostrando todas las mesas disponibles

3. **Seleccionar nueva(s) mesa(s)**
   - Las mesas se muestran agrupadas por salón
   - 🟢 Verde = Disponible
   - 🔴 Roja = Ocupada (no seleccionable)
   - Mesa(s) actual(es) marcada(s) con anillo naranja "Actual"
   - Puedes seleccionar una o múltiples mesas

4. **Confirmar cambio**
   - Revisa que las mesas seleccionadas sean correctas
   - Clic en **"✅ Confirmar Cambio"**
   - El sistema actualiza automáticamente

5. **Resultado**
   - ✅ Comanda movida a nueva(s) mesa(s)
   - ✅ Mesa(s) anterior(es) liberada(s)
   - ✅ Nueva(s) mesa(s) marcada(s) como ocupada(s)
   - Vista actualizada en tiempo real

## ⚙️ Detalles Técnicos

### Backend

**Endpoint**: `PATCH /api/comandas/:id/cambiar-mesa`

**Request Body:**
```json
{
  "nuevas_mesas": [
    { "id": "mesa-uuid-1" },
    { "id": "mesa-uuid-2" }
  ]
}
```

**Flujo:**
1. Valida que la comanda existe y es de tipo "mesa"
2. Verifica que las nuevas mesas existen y están disponibles
3. Inicia transacción de base de datos
4. Elimina relaciones antiguas de `comanda_mesas`
5. Crea nuevas relaciones con las mesas seleccionadas
6. Libera mesas anteriores (ocupada = 0)
7. Ocupa nuevas mesas (ocupada = 1)
8. Actualiza timestamp de la comanda
9. Commit de la transacción

**Validaciones:**
- ❌ Comanda no encontrada
- ❌ Comanda es de tipo domicilio
- ❌ Alguna mesa nueva ya está ocupada
- ❌ Alguna mesa nueva no existe
- ✅ Todo correcto → Cambio exitoso

### Frontend

**Componente**: `SeleccionMesaYMesero.tsx`

**Características UI:**
- Modal responsivo con scroll
- Selector visual de mesas agrupadas por salón
- Indicadores claros de disponibilidad
- Confirmación antes de cambiar
- Loading state durante el proceso
- Manejo de errores con mensajes claros
- Actualización automática de la vista

**Estados:**
```typescript
- mostrarModalCambioMesa: boolean
- comandaCambiandoMesa: Comanda | null
- mesasSeleccionadasCambio: Mesa[]
- cambiandoMesa: boolean (loading)
- errorCambioMesa: string | null
```

## 🛡️ Seguridad y Validaciones

### Backend
✅ Validación de existencia de comanda
✅ Validación de tipo de pedido (solo mesa)
✅ Validación de disponibilidad de mesas
✅ Transacciones de base de datos (rollback automático en errores)
✅ Logs detallados de cada operación

### Frontend
✅ Deshabilita mesas ocupadas
✅ Requiere al menos una mesa seleccionada
✅ Deshabilita botones durante el proceso
✅ Muestra errores de forma clara
✅ Recarga datos automáticamente después del cambio

## 🎨 Diseño Visual

- **Botón Cambiar Mesa**: 🟠 Naranja (diferente del azul de Editar)
- **Modal**: Fondo blanco con overlay oscuro
- **Mesas Disponibles**: 🟢 Verde con borde gris
- **Mesas Ocupadas**: 🔴 Roja con fondo gris deshabilitado
- **Mesa Actual**: Anillo naranja + etiqueta "Actual"
- **Mesas Seleccionadas**: ✅ Azul con check
- **Confirmación**: Verde con mensaje de éxito

## 📊 Ejemplos

### Cambio Simple (1 mesa a 1 mesa)
```
Antes: Mesa A-1 → Comanda #123
Después: Mesa B-5 → Comanda #123
Resultado: A-1 libre, B-5 ocupada
```

### Cambio a Múltiples Mesas
```
Antes: Mesa C-2 → Comanda #456
Después: Mesa C-3, C-4 → Comanda #456
Resultado: C-2 libre, C-3 y C-4 ocupadas
```

### Cambio desde Múltiples Mesas
```
Antes: Mesa D-1, D-2 → Comanda #789
Después: Mesa D-10 → Comanda #789
Resultado: D-1 y D-2 libres, D-10 ocupada
```

## ⚠️ Consideraciones Importantes

1. **Solo para comandas de mesa**: Los pedidos de domicilio/para llevar no tienen botón de cambiar mesa

2. **No afecta los items**: Solo cambia la mesa, todos los items y el estado de la comanda permanecen iguales

3. **Liberación automática**: Las mesas anteriores se liberan automáticamente, no necesitas hacerlo manual

4. **Actualización en tiempo real**: El cambio se refleja inmediatamente en todos los dispositivos conectados (actualización cada 5 segundos)

5. **Auditoría**: Cada cambio actualiza el timestamp de `fecha_actualizacion` de la comanda

## 🚀 Ventajas

✅ **Rápido**: 2 clics (botón + confirmar)
✅ **Seguro**: Transacciones con rollback automático
✅ **Intuitivo**: UI clara con indicadores visuales
✅ **Flexible**: Soporta una o múltiples mesas
✅ **Sin errores**: Validaciones en frontend y backend
✅ **Limpio**: Todo dinámico, sin hardcodeo

## 🔮 Mejoras Futuras (Opcionales)

- [ ] Historial de cambios de mesa por comanda
- [ ] Notificación push a cocina del cambio
- [ ] Razón del cambio (opcional)
- [ ] Confirmación doble para cambios críticos

---

**Implementado**: 29 de diciembre de 2025  
**Versión**: 1.0.0
