@echo off
title Probar Plugin de Impresion
color 0B
echo.
echo ========================================================
echo     PRUEBA DEL PLUGIN DE IMPRESION
echo ========================================================
echo.
echo Este script probara todos los endpoints del plugin:
echo   - Estado del servicio
echo   - Deteccion de impresoras
echo   - Impresion de prueba
echo.
echo IMPORTANTE: El plugin debe estar corriendo primero.
echo Si no lo esta, ejecute INICIAR_PLUGIN.bat en otra ventana.
echo.
pause
echo.

python test_plugin.py

echo.
pause
