@echo off
cd /d "[RUTA_DEL_BACKEND]"
start "Backend Casa Montis" cmd /k npm run dev

cd /d "[RUTA_DEL_FRONTEND]"
start "Frontend Casa Montis" cmd /k npm run dev