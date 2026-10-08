@echo off
title AuraPriv Launcher
echo ========================================================
echo  Launching AuraPriv Full-Stack System
echo  Backend Server:  http://localhost:5000
echo  Frontend Client: http://localhost:5173
echo ========================================================
start "AuraPriv Server" cmd /k "cd server && npm run dev"
timeout /t 2 /nobreak >nul
start "AuraPriv Client" cmd /k "cd client && npm run dev"
echo Both servers are launching in separate windows!
pause
