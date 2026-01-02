# 📱 Guía para Acceder al Sistema desde Otros Dispositivos

## 🎯 Requisitos
- Todos los dispositivos deben estar conectados a la **misma red WiFi**
- El servidor (tu computadora) debe estar ejecutándose
- El firewall de Windows debe permitir conexiones en los puertos 3000 y 3001

---

## 🚀 Paso 1: Obtener la IP del Servidor

### Windows (PowerShell o CMD):
```powershell
ipconfig
```
Busca la línea **"Dirección IPv4"** en tu adaptador WiFi activo.
Ejemplo: `192.168.1.100`

### Mac/Linux:
```bash
ifconfig
```
Busca tu IP en la sección **"inet"** del adaptador activo.

---

## ⚙️ Paso 2: Configurar el Backend

El backend ya está configurado para:
- Escuchar en todas las interfaces de red (`0.0.0.0`)
- Permitir conexiones CORS desde cualquier IP de red local
- Mostrar la IP correcta al iniciar

Cuando inicies el backend verás:
```
🚀 Servidor ejecutándose en:
   - Local:   http://localhost:3001
   - Red:     http://192.168.1.100:3001
🏥 Health check: http://localhost:3001/health

📱 Para acceder desde otros dispositivos:
   1. Conecta los dispositivos a la misma red WiFi
   2. En el frontend, usa: http://192.168.1.100:3001
```

---

## 🌐 Paso 3: Configurar el Frontend

1. Abre el archivo **`frontend/.env.local`**

2. Actualiza la IP con la que te mostró el backend:
```env
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001/api
```
(Reemplaza `192.168.1.100` con TU IP)

3. Reinicia el servidor de Next.js (Ctrl+C y luego `npm run dev`)

---

## 📋 Paso 4: Configurar el Firewall de Windows

### Opción 1: Desactivar temporalmente (Solo para pruebas)
```powershell
# En PowerShell como Administrador:
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

### Opción 2: Crear reglas específicas (Recomendado)
```powershell
# En PowerShell como Administrador:

# Permitir puerto 3000 (Frontend)
New-NetFirewallRule -DisplayName "Next.js Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Permitir puerto 3001 (Backend)
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Opción 3: Manual (GUI)
1. Abre **"Firewall de Windows Defender"**
2. Clic en **"Configuración avanzada"**
3. Clic en **"Reglas de entrada"** → **"Nueva regla"**
4. Selecciona **"Puerto"** → Siguiente
5. TCP → Puertos específicos: **3000, 3001** → Siguiente
6. **Permitir la conexión** → Siguiente
7. Selecciona **todos los perfiles** → Siguiente
8. Nombre: **"Casa Montis Sistema"** → Finalizar

---

## 🌍 Paso 5: Acceder desde Otros Dispositivos

### Desde el Servidor (tu PC):
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

### Desde Otros Dispositivos (tablet, celular, otra PC):
Usando la IP que obtuviste (ejemplo: `192.168.1.100`):
- Frontend: `http://192.168.1.100:3000`
- Backend: `http://192.168.1.100:3001`

---

## ✅ Verificar Conexión

### 1. Verificar Backend
Desde cualquier dispositivo en la red, abre el navegador y ve a:
```
http://TU_IP:3001/health
```
Deberías ver:
```json
{
  "status": "OK",
  "timestamp": "2025-12-18T...",
  "uptime": 123.456,
  "version": "1.1.0"
}
```

### 2. Verificar Frontend
Abre en el navegador:
```
http://TU_IP:3000
```
Deberías ver la aplicación de Casa Montis.

---

## 🔧 Solución de Problemas

### ❌ "No se puede conectar al servidor"
**Posibles causas:**
1. El firewall está bloqueando las conexiones
   - **Solución:** Sigue el Paso 4 para configurar el firewall
   
2. La IP cambió
   - **Solución:** Verifica tu IP actual con `ipconfig` y actualiza `.env.local`
   
3. Los dispositivos están en redes WiFi diferentes
   - **Solución:** Conecta todos los dispositivos a la misma red

### ❌ "CORS Error" en el navegador
**Causa:** El backend está rechazando la conexión desde esa IP
**Solución:** El backend ahora permite automáticamente todas las IPs locales (192.168.x.x, 10.x.x.x)

### ❌ El frontend no se conecta al backend
**Causa:** La variable de entorno no se actualizó
**Solución:** 
1. Verifica que `.env.local` tiene la IP correcta
2. Reinicia el servidor Next.js (Ctrl+C y `npm run dev`)
3. Limpia el caché del navegador (Ctrl+Shift+R)

---

## 📝 Notas Importantes

1. **IP Dinámica**: Tu IP local puede cambiar cada vez que reconectes al WiFi. Si dejas de tener conexión, verifica tu IP nuevamente.

2. **Modo Desarrollo**: Esta configuración es para desarrollo local. Para producción necesitarías:
   - Un dominio o IP pública
   - HTTPS (certificado SSL)
   - Configuración de puerto forwarding en el router

3. **Rendimiento**: La conexión será tan rápida como tu red WiFi. Para mejor rendimiento:
   - Usa WiFi 5GHz si está disponible
   - Asegúrate de tener buena señal
   - Evita muchos dispositivos conectados simultáneamente

4. **Seguridad**: Este sistema solo es accesible dentro de tu red local. Nadie desde internet puede acceder.

---

## 🎉 ¡Listo!

Ahora puedes usar tablets, celulares o cualquier dispositivo en tu red local para:
- Tomar comandas desde la sala
- Ver el estado de las mesas
- Gestionar el sistema desde cualquier lugar del restaurante

---

## 📞 Comando Rápido para Compartir

Para que tus empleados accedan fácilmente, puedes decirles:

**"Conecta tu dispositivo al WiFi [NOMBRE_DE_TU_WIFI] y abre en el navegador: `http://TU_IP:3000`"**

Ejemplo:
**"Conecta tu dispositivo al WiFi 'RestauranteMontis' y abre: `http://192.168.1.100:3000`"**
