@echo off
title MELI WORLD - Logistics Life
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias - primeira vez...
  call npm install
)
start "" http://localhost:5173
call npm run dev
