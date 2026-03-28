@echo off
title Kadosh — Modo Desenvolvedor
echo.
echo  Instalando dependencias do Kadosh Voz...
call npm install
echo.
echo  Iniciando Next.js (servidor de paginas)...
start "Kadosh Next.js" cmd /c "cd .. && npm run dev"

echo  Aguardando Next.js iniciar...
timeout /t 5 /nobreak >nul

echo  Iniciando Kadosh Voz...
start "Kadosh Servidor Voz" cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo  Abrindo interfaces...
start "" http://localhost:3000
start "" http://localhost:3333

echo.
echo  Iniciando tunel publico (ngrok)...
echo  Copie o link "Forwarding" para acessar de qualquer lugar
echo.
node_modules\ngrok\bin\ngrok.exe http 3333
pause
