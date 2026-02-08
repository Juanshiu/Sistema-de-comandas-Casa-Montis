@echo off
title Compilar Plugin a EXE
color 0E
echo.
echo ========================================================
echo     COMPILACION A EJECUTABLE (.EXE)
echo ========================================================
echo.
echo Este script compilara el plugin a un ejecutable standalone
echo que NO requiere Python instalado para funcionar.
echo.
echo Seleccione el modo de compilacion:
echo.
echo [1] PRODUCCION - Sin consola (recomendado para cliente)
echo [2] DEBUG - Con consola (para desarrollo/debugging)
echo.
set /p modo="Ingrese opcion (1 o 2): "

if "%modo%"=="2" (
    set "argumento=debug"
    echo.
    echo Compilando en modo DEBUG (con consola)...
) else (
    set "argumento="
    echo.
    echo Compilando en modo PRODUCCION (sin consola)...
)

echo.
pause
echo.

echo [1/3] Verificando Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado.
    pause
    exit /b 1
)
echo [OK] Python detectado
echo.

echo [2/3] Instalando PyInstaller...
python -m pip install --quiet --upgrade pyinstaller
echo [OK] PyInstaller listo
echo.

echo [3/3] Compilando server.py a .exe...
python build_exe.py %argumento%

echo.
echo ========================================================
echo     COMPILACION COMPLETADA
echo ========================================================
echo.
echo El ejecutable esta en: dist\CasaMontis-PrintPlugin.exe
echo.
echo IMPORTANTE: Comparta este .exe con el cliente.
echo Solo necesita hacer doble clic para ejecutarlo.
echo.
echo La impresora debe estar COMPARTIDA en Windows para que
echo funcione correctamente (Panel de Control - Impresoras).
echo.
pause
