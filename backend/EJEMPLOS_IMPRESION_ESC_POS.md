# Ejemplos de Impresión con Plugin HTTP a ESC/POS

## 📦 Estructura del JSON enviado al plugin

El backend ahora envía peticiones HTTP POST a `http://localhost:8000/imprimir` con el siguiente formato:

### Ejemplo 1: Comanda Completa

```json
{
  "serial": "",
  "nombreImpresora": "pos58",
  "operaciones": [
    {
      "nombre": "EscribirTexto",
      "argumentos": [
        "     COMANDA DE COCINA\n\nFecha: 20/12/2025\nHora:  14:30\n\nMesero: Juan Diego\nMesa(s): Principal-3\nCapacidad: 6 pers.\n\n================================\n          PRODUCTOS\n================================\n\n1x ALMUERZO DEL DIA\n\n  PERSONALIZACION:\n    Caldos/Sopas: Sopa de Pollo\n    Principios: Papa Criolla\n    Proteínas: Cerdo\n\n--------------------------------\n1x JUGO NATURAL\n\n================================\n\n     ENVIADO A COCINA\n================================\n\n\n"
      ]
    },
    {
      "nombre": "Cortar",
      "argumentos": []
    }
  ]
}
```

### Ejemplo 2: Items Adicionales

```json
{
  "serial": "",
  "nombreImpresora": "pos58",
  "operaciones": [
    {
      "nombre": "EscribirTexto",
      "argumentos": [
        "     COMANDA DE COCINA\n================================\n\nMESA: Principal-5\n\n20/12/2025\n15:45\nMesero: Juan Diego\n================================\n\n  ** PRODUCTOS ADICIONALES **\n\n1x BANDEJA PAISA\n  Obs:\n  Sin frijoles\n\n================================\n         *** URGENTE ***\n    SOLO PRODUCTOS NUEVOS\n================================\n\n\n"
      ]
    },
    {
      "nombre": "Cortar",
      "argumentos": []
    }
  ]
}
```

## 🔧 Configuración necesaria

### 1. Variables de entorno (.env)

```env
ESC_POS_URL=http://localhost:8000/imprimir
PRINTER_COCINA_NAME=pos58
PRINTER_CAJA_NAME=pos58
```

### 2. Plugin HTTP a ESC/POS

- **Descargar**: https://parzibyte.me/http-esc-pos-desktop-docs/es/
- **Ejecutar**: El plugin debe estar corriendo en `localhost:8000`
- **Configurar**: Agregar la impresora "pos58" en el plugin

### 3. Impresora

- **Modelo**: DigitalPOS DIG 58IIA (58mm térmica)
- **Conexión**: USB
- **Nombre en Windows**: "pos58"

## ✅ Ventajas de este método

1. **Sin archivos temporales** - Ya no se crean archivos .txt
2. **Sin PowerShell** - Eliminados comandos cmd/powershell
3. **ESC/POS real** - Comandos directos a la impresora
4. **Mejor encoding** - Soporte correcto para tildes y ñ
5. **Formato consistente** - Ancho fijo de 32 caracteres respetado
6. **Corte automático** - El plugin ejecuta el corte de papel

## 🧪 Probar la impresión

```bash
# En el backend
npm run dev

# Luego hacer una comanda desde el frontend
# El log mostrará el JSON enviado al plugin
```

## 📝 Log típico exitoso

```
🖨️  ===== FUNCIÓN IMPRIMIR COMANDA LLAMADA =====
🖨️  ID Comanda: abc123
🖨️  Items en comanda: 2
📄 Generando formato de comanda completa...
🖨️  Enviando a ESC/POS - Impresora: pos58
🌐 URL: http://localhost:8000/imprimir
📦 Payload construido: { ... }
✅ Respuesta del plugin: { "success": true }
✅ Impresión enviada exitosamente por ESC/POS
✅ Comanda impresa exitosamente
```

## ⚠️ Troubleshooting

### Error: ECONNREFUSED

- **Causa**: El plugin no está corriendo
- **Solución**: Ejecutar el plugin HTTP a ESC/POS

### Error: Impresora no encontrada

- **Causa**: Nombre incorrecto en .env
- **Solución**: Verificar que `PRINTER_COCINA_NAME=pos58` coincida con el nombre en el plugin

### Caracteres raros en tildes

- **Causa**: Codepage incorrecta
- **Solución**: En el plugin, configurar codepage CP850 o CP1252 para español
