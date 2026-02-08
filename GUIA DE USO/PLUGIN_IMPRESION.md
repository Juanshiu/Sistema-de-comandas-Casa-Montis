# 🖨️ Plugin de Impresión Propio - Montis Cloud

## 📌 ¿Qué es esto?

Un **servidor HTTP local** que actúa como plugin de impresión térmico **100% propio**, sin marcas de agua ni dependencias de terceros de pago.

Inspirado en el concepto de [quiero1app.com](https://quiero1app.com/blog/programando_plugin_impresora_termica/), este plugin:

- ✅ Recibe peticiones HTTP con texto a imprimir
- ✅ Convierte caracteres españoles (á, é, í, ó, ú, ñ) a encoding CP850
- ✅ Envía comandos ESC/POS raw a la impresora
- ✅ Usa el comando `copy /b` de Windows (preserva bytes exactos)
- ✅ Sin marca de agua
- ✅ Sin plugins de pago

---

## 🚀 Cómo funciona

```
Frontend/API
    ↓ HTTP POST
Plugin propio (puerto 8001)
    ↓ Encoding CP850
Comandos ESC/POS raw
    ↓ copy /b archivo.bin
Impresora USB (pos58)
```

---

## 📡 API del plugin

### POST `/imprimir`

Imprime contenido en la impresora térmica.

**Request:**
```json
{
  "texto": "COMANDA DE COCINA\n\nMesa: 5\n1x ALMUERZO",
  "impresora": "pos58",
  "cortar": true,
  "encoding": "cp850"
}
```

**Response:**
```json
{
  "success": true,
  "mensaje": "Impresión completada",
  "bytes": 1024
}
```

---

### POST `/probar`

Prueba de impresión con texto de ejemplo.

**Request:**
```json
{
  "impresora": "pos58"
}
```

**Response:**
```json
{
  "success": true,
  "mensaje": "Prueba de impresión completada"
}
```

---

### GET `/status`

Estado del servidor del plugin.

**Response:**
```json
{
  "success": true,
  "servicio": "Plugin de Impresión Montis Cloud",
  "version": "1.0.0",
  "puerto": 8001,
  "sistema": "win32",
  "activo": true
}
```

---

## 🔧 Configuración

### 1. Variables de entorno (.env)

```env
ESC_POS_URL=http://localhost:8001/imprimir
PRINTER_COCINA_NAME=pos58
PRINTER_CAJA_NAME=pos58
```

### 2. Impresora en Windows

**Requisito:** La impresora debe estar instalada y compartida en Windows.

**Pasos:**
1. Abre "Dispositivos e impresoras"
2. Verifica que aparezca "pos58"
3. Click derecho → Propiedades
4. Pestaña "Compartir"
5. ✅ Marcar "Compartir esta impresora"
6. Nombre del recurso: `pos58`

Esto permite usar el comando:
```cmd
copy /b archivo.bin \\localhost\pos58
```

---

## 🧪 Probar el plugin

### Desde el código:

```typescript
// El plugin se inicia automáticamente con el backend
npm run dev
```

Deberías ver:
```
🖨️  PLUGIN DE IMPRESIÓN MONTIS CLOUD
==================================================
✅ Servidor HTTP iniciado en http://127.0.0.1:8001
📡 Endpoints disponibles:
   POST /imprimir - Imprimir contenido
   POST /probar   - Prueba de impresora
   GET  /status   - Estado del servicio
==================================================
💡 Sin marcas de agua | 100% control propio
```

### Desde Postman/cURL:

**Verificar estado:**
```bash
curl http://localhost:8001/status
```

**Imprimir prueba:**
```bash
curl -X POST http://localhost:8001/probar \
  -H "Content-Type: application/json" \
  -d '{"impresora":"pos58"}'
```

---

## 📝 Comandos ESC/POS implementados

| Comando | Hex | Descripción |
|---------|-----|-------------|
| Inicializar | `ESC @` | `1B 40` | Resetea impresora |
| Tabla CP850 | `ESC t 6` | `1B 74 06` | Encoding español |
| Cortar papel | `GS V 0` | `1D 56 00` | Corte parcial |
| Avanzar líneas | `ESC d n` | `1B 64 n` | Feed de papel |

---

## 🔤 Encoding de caracteres

El plugin mapea caracteres españoles a CP850:

| Carácter | Código CP850 (hex) |
|----------|-------------------|
| á | A0 |
| é | 82 |
| í | A1 |
| ó | A2 |
| ú | A3 |
| ñ | A4 |
| Ñ | A5 |
| ¿ | A8 |
| ¡ | AD |

---

## 🆚 Comparación con otros métodos

| Aspecto | Plugin Parzibyte | Nuestro Plugin | PowerShell |
|---------|-----------------|----------------|------------|
| Marca de agua | ❌ Sí (gratis) | ✅ No | ✅ No |
| Encoding correcto | ✅ Sí | ✅ Sí | ❌ Problemas |
| Estabilidad | ✅ Alta | ✅ Alta | ⚠️ Media |
| Costo | $30 USD | ✅ Gratis | ✅ Gratis |
| Control total | ❌ No | ✅ Sí | ⚠️ Parcial |

---

## 🐛 Troubleshooting

### Error: "No se pudo conectar"
- Verifica que la impresora esté compartida: `net share`
- Debería aparecer: `pos58         \\localhost\pos58`

### Error: "Access denied"
- Ejecuta como administrador o ajusta permisos de impresora

### Caracteres extraños
- Verifica que el encoding sea `cp850`
- Verifica la tabla de caracteres de tu impresora (manual ESC/POS)

### No imprime nada
- Prueba manualmente: `echo TEST > test.txt && copy /b test.txt \\localhost\pos58`
- Verifica que la impresora esté encendida
- Revisa cola de impresión en Windows

---

## 📚 Referencias

- [Quiero1App - Plugin Impresora](https://quiero1app.com/blog/programando_plugin_impresora_termica/)
- [ESC/POS Command Manual](../ESCPOS_Command_Manual.pdf)
- [Code Page 850 (IBM)](https://en.wikipedia.org/wiki/Code_page_850)

---

## ✨ Ventajas de esta solución

1. **Sin costos adicionales** - 100% código propio
2. **Sin marca de agua** - Tickets profesionales
3. **Control total** - Podemos ajustar lo que necesitemos
4. **Mantenible** - Código simple y claro
5. **Portable** - Funciona en cualquier Windows con Node.js

---

**Hecho con ❤️ para Montis Cloud**
