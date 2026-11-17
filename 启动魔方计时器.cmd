@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.3 or newer is required. Install it, then run this file again.
  pause
  exit /b 1
)
node tools\launch.cjs
if errorlevel 1 pause
