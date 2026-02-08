@echo off
cd /d "[RUTA_DEL_BACKEND]"
start "Backend Montis Cloud" cmd /k npm run dev

cd /d "[RUTA_DEL_FRONTEND]"
start "Frontend Montis Cloud" cmd /k npm run dev

cd /d "[RUTA_DEL_ADMIN_PANEL]"
start "Admin Panel Montis Cloud" cmd /k npm run dev