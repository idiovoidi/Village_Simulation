@echo off
REM Simple batch script to launch server and open browser
echo Starting Village Sim...
start "" "http://localhost:3000"
node server.js
