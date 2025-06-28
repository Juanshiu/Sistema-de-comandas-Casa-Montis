#!/bin/bash

# Script para inicializar el sistema de comandas Casa Montis

echo "🏗️  Iniciando sistema de comandas Casa Montis..."

# Instalar dependencias del backend
echo "📦 Instalando dependencias del backend..."
cd backend
npm install

# Crear directorio de base de datos
mkdir -p database

# Compilar TypeScript
echo "🔨 Compilando backend..."
npm run build

echo "✅ Backend listo!"

# Instalar dependencias del frontend
echo "📦 Instalando dependencias del frontend..."
cd ../frontend
npm install

echo "✅ Frontend listo!"

echo "🚀 Sistema de comandas Casa Montis configurado correctamente!"
echo ""
echo "Para iniciar el sistema:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:3001"
echo "- Health check: http://localhost:3001/health"
