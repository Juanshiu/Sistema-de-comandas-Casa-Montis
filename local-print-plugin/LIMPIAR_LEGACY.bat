@echo off
title Limpiar Archivos Legacy de Node.js
color 0C
echo.
echo ========================================================
echo     LIMPIEZA DE ARCHIVOS LEGACY (NODE.JS)
echo ========================================================
echo.
echo Este script eliminara los siguientes archivos/carpetas:
echo   - node_modules/           (~200 MB)
echo   - package-lock.json
echo   - package.json
echo   - run.bat
echo.
echo IMPORTANTE: Esta accion es IRREVERSIBLE.
echo El ejecutable .exe ya esta compilado y NO necesita estos archivos.
echo.
echo ========================================================

set /p confirmar="Desea continuar con la limpieza? (S/N): "

if /i not "%confirmar%"=="S" (
    echo.
    echo [CANCELADO] Limpieza cancelada por el usuario.
    pause
    exit /b 0
)

echo.
echo ========================================================
echo     INICIANDO LIMPIEZA...
echo ========================================================
echo.

REM Eliminar node_modules
if exist "node_modules\" (
    echo [1/4] Eliminando node_modules/...
    rmdir /s /q "node_modules"
    echo [OK] node_modules eliminado
) else (
    echo [SKIP] node_modules no encontrado
)

REM Eliminar package-lock.json
if exist "package-lock.json" (
    echo [2/4] Eliminando package-lock.json...
    del /f /q "package-lock.json"
    echo [OK] package-lock.json eliminado
) else (
    echo [SKIP] package-lock.json no encontrado
)

REM Eliminar package.json
if exist "package.json" (
    echo [3/4] Eliminando package.json...
    del /f /q "package.json"
    echo [OK] package.json eliminado
) else (
    echo [SKIP] package.json no encontrado
)

REM Eliminar run.bat
if exist "run.bat" (
    echo [4/4] Eliminando run.bat...
    del /f /q "run.bat"
    echo [OK] run.bat eliminado
) else (
    echo [SKIP] run.bat no encontrado
)

echo.
echo ========================================================

REM Preguntar si quiere eliminar build/
echo.
echo Desea tambien eliminar la carpeta temporal build/?
echo (Se regenera cada vez que compila, puede eliminarla sin problema)
echo.
set /p limpiar_build="Eliminar build/? (S/N): "

if /i "%limpiar_build%"=="S" (
    if exist "build\" (
        echo.
        echo Eliminando build/...
        rmdir /s /q "build"
        echo [OK] build eliminado
    ) else (
        echo [SKIP] build no encontrado
    )
)

REM Preguntar sobre server.js
echo.
echo ========================================================
echo.
echo Desea renombrar server.js a server.js.backup?
echo (Mantenerlo como referencia por si acaso)
echo.
set /p backup_serverjs="Renombrar server.js? (S/N): "

if /i "%backup_serverjs%"=="S" (
    if exist "server.js" (
        echo.
        echo Renombrando server.js a server.js.backup...
        ren "server.js" "server.js.backup"
        echo [OK] server.js renombrado a server.js.backup
    ) else (
        echo [SKIP] server.js no encontrado
    )
)

echo.
echo ========================================================
echo     LIMPIEZA COMPLETADA
echo ========================================================
echo.
echo Archivos eliminados correctamente.
echo El plugin Python y el ejecutable .exe NO fueron afectados.
echo.
echo Archivos que quedan:
echo   - dist\CasaMontis-PrintPlugin.exe  (EJECUTABLE)
echo   - server.py                         (Codigo fuente)
echo   - Todos los archivos .md            (Documentacion)
echo   - Scripts .bat de desarrollo
echo.
pause
