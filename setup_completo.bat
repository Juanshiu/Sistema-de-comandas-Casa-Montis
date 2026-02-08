@echo off
title Setup Completo - Montis Cloud
color 0B
cls

echo ============================================================
echo         MONTIS CLOUD - SETUP E INSTALACION COMPLETO
echo ============================================================
echo.
echo Este script realizara:
echo  1. Instalacion de dependencias Backend (npm install)
echo  2. Instalacion de dependencias Frontend (npm install)
echo  3. Instalacion de dependencias Admin-Panel (npm install)
echo  4. Instalacion de dependencias Plugin Python (pip install)
echo  5. Ejecucion de migraciones de base de datos
echo  6. Inicio de todos los servicios
echo.
echo NOTA: Asegurate de tener PostgreSQL configurado antes de continuar
echo       (Ver instrucciones en README.md seccion "Configurar PostgreSQL")
echo.
pause

:: =====================================================
:: 1. BACKEND - Instalar dependencias
:: =====================================================
echo.
echo ============================================================
echo [1/5] BACKEND - Instalando dependencias...
echo ============================================================
cd /d "%~dp0backend"
if not exist "node_modules" (
    echo Instalando paquetes npm del backend...
    call npm install
) else (
    echo [OK] Dependencias del backend ya instaladas
)
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion del backend
    pause
    exit /b 1
)

:: =====================================================
:: 2. FRONTEND - Instalar dependencias
:: =====================================================
echo.
echo ============================================================
echo [2/5] FRONTEND - Instalando dependencias...
echo ============================================================
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Instalando paquetes npm del frontend...
    call npm install
) else (
    echo [OK] Dependencias del frontend ya instaladas
)
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion del frontend
    pause
    exit /b 1
)

:: =====================================================
:: 3. ADMIN-PANEL - Instalar dependencias
:: =====================================================
echo.
echo ============================================================
echo [3/5] ADMIN-PANEL - Instalando dependencias...
echo ============================================================
cd /d "%~dp0admin-panel"
if not exist "node_modules" (
    echo Instalando paquetes npm del admin-panel...
    call npm install
) else (
    echo [OK] Dependencias del admin-panel ya instaladas
)
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion del admin-panel
    pause
    exit /b 1
)

:: =====================================================
:: 4. PLUGIN PYTHON - Verificar e instalar
:: =====================================================
echo.
echo ============================================================
echo [4/5] PLUGIN DE IMPRESION - Verificando Python...
echo ============================================================
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] Python no detectado. El plugin de impresion no funcionara.
    echo Descarga Python desde: https://www.python.org/downloads/
    echo.
    echo Puedes continuar sin el plugin, pero la impresion no estara disponible.
    choice /C SN /M "Deseas continuar sin el plugin de impresion"
    if errorlevel 2 exit /b 1
) else (
    echo [OK] Python detectado
    cd /d "%~dp0local-print-plugin"
    echo Instalando dependencias Python...
    python -m pip install --quiet --upgrade pip
    python -m pip install --quiet -r requirements.txt
    echo [OK] Dependencias del plugin instaladas
)

:: =====================================================
:: 5. BASE DE DATOS - Ejecutar migraciones
:: =====================================================
echo.
echo ============================================================
echo [5/5] BASE DE DATOS - Ejecutando migraciones...
echo ============================================================
cd /d "%~dp0backend"
echo Verificando archivo .env...
if not exist ".env" (
    echo [ERROR] No existe archivo .env en backend/
    echo Por favor copia .env.example a .env y configuralo
    echo con tus credenciales de PostgreSQL
    pause
    exit /b 1
)

echo Ejecutando migraciones de base de datos...
call npm run migrate
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallo la ejecucion de migraciones
    echo Verifica que PostgreSQL este corriendo y las credenciales en .env sean correctas
    pause
    exit /b 1
)

:: =====================================================
:: INICIO DE SERVICIOS
:: =====================================================
echo.
echo ============================================================
echo          SETUP COMPLETADO - INICIANDO SERVICIOS
echo ============================================================
echo.
echo Se abriran 4 ventanas de terminal:
echo  1. Plugin de Impresion (puerto 8001)
echo  2. Backend API (puerto 3001)
echo  3. Frontend App (puerto 3000)
echo  4. Admin Panel (puerto 3002)
echo.
echo NOTA: NO cierres ninguna ventana mientras uses el sistema
echo.
pause

:: Iniciar Plugin de Impresion (solo si Python esta instalado)
where python >nul 2>&1
if %errorlevel% equ 0 (
    cd /d "%~dp0local-print-plugin"
    start "Plugin de Impresion - Puerto 8001" cmd /k "color 0A && python server.py"
    timeout /t 2 >nul
)

:: Iniciar Backend
cd /d "%~dp0backend"
start "Backend Montis Cloud - Puerto 3001" cmd /k "color 0E && npm run dev"
timeout /t 3 >nul

:: Iniciar Frontend
cd /d "%~dp0frontend"
start "Frontend Montis Cloud - Puerto 3000" cmd /k "color 0D && npm run dev"
timeout /t 2 >nul

:: Iniciar Admin Panel
cd /d "%~dp0admin-panel"
start "Admin Panel Montis Cloud - Puerto 3002" cmd /k "color 0C && npm run dev"

echo.
echo ============================================================
echo              TODOS LOS SERVICIOS INICIADOS
echo ============================================================
echo.
echo URLs de acceso:
echo  - Frontend:       http://localhost:3000
echo  - Backend API:    http://localhost:3001
echo  - Admin Panel:    http://localhost:3002
echo  - Plugin Impresion: http://localhost:8001
echo.
echo ============================================================
pause
