@echo off
title Plugin de Impresion Montis Cloud - Python
color 0A
echo.
echo ========================================================
echo     PLUGIN DE IMPRESION MONTIS CLOUD
echo ========================================================
echo.
echo Verificando Python...

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado en este equipo.
    echo Por favor instale Python desde: https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Python detectado
echo.
echo Instalando/actualizando dependencias...
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt

echo.
echo ========================================================
echo     INICIANDO SERVIDOR DE IMPRESION...
echo ========================================================
echo.
python server.py

pause
