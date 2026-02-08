# Admin Panel - Configuración

## 📋 Descripción

El Admin Panel es una aplicación Next.js 14 independiente que se conecta al backend principal para:
- Gestión de empresas en modo SaaS
- Impersonación de usuarios para soporte
- Administración de planes y licencias
- Auditoría de cambios

## 🔧 Configuración de Conexión al Backend

### Desarrollo Local

El admin panel se conecta al backend mediante **rewrites de Next.js**, actuando como un proxy inverso.

**Archivo: `.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
```

**¿Cómo funciona?**
- Todas las llamadas a `/api/*` se reescriben automáticamente
- Next.js hace proxy hacia `http://localhost:3001/api/*`
- Configurado en `next.config.js`

### Producción (Nube)

Cuando despliegues a Vercel/Netlify/Railway:

**1. Configurar variable de entorno:**
```env
NEXT_PUBLIC_API_URL=https://tu-backend-en-produccion.com
```

**2. Agregar en el dashboard de la plataforma:**
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables  
- Railway: Variables → Add Variable

**3. Redeploy:**
```bash
git push origin main
# O desde dashboard: Manual Deploy
```

## 🚀 Comandos

```bash
# Desarrollo
npm run dev          # Puerto 3002

# Producción
npm run build
npm start

# Linting
npm run lint
```

## 📁 Estructura

```
admin-panel/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Redirect a /login o /dashboard
│   │   ├── login/                # Página de login admin
│   │   └── dashboard/            # Dashboard principal
│   │       ├── page.tsx          # Lista de empresas
│   │       ├── empresa/[id]/     # Detalle de empresa
│   │       └── planes/           # Gestión de planes
│   ├── components/
│   │   └── Impersonation.tsx     # Modal de impersonación
│   ├── hooks/
│   │   └── useImpersonation.ts   # Hook de impersonación
│   └── config/
│       └── index.ts              # Configuración centralizada
├── .env.example                  # Template de variables
├── .env.local                    # Variables locales (no commiteado)
└── next.config.js                # Rewrites para proxy
```

## 🔐 Autenticación

El admin panel usa tokens JWT independientes del sistema principal:

**Storage:**
- Token: `localStorage.getItem('admin_token')`
- Usuario: `localStorage.getItem('admin_user')`

**Headers:**
```typescript
Authorization: Bearer {token}
```

## 🛠️ Troubleshooting

### Error: "Failed to fetch"
- Verificar que backend esté corriendo en puerto 3001
- Comprobar `NEXT_PUBLIC_API_URL` en `.env.local`
- Revisar CORS en backend (debe aceptar `http://localhost:3002`)

### Error: "Unauthorized"
- Token expirado o inválido
- Refrescar página para re-login
- Verificar `admin_token` en localStorage

### Rewrites no funcionan
- Reiniciar dev server después de cambiar `.env.local`
- Verificar sintaxis en `next.config.js`
- `console.log` en config para debug

## 📚 Referencias

- [Next.js Rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites)
- [Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- Backend API: Ver `/backend/src/routes/admin.ts`
