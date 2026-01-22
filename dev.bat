@echo off
REM Development startup script for Selection Assistant (Windows)

echo.
echo 🔧 Building main process first...
call npm run build:main

echo.
echo 🚀 Starting development environment...
echo    - TypeScript watcher for main process
echo    - Vite dev server on http://localhost:5173
echo    - Electron app (will start after Vite is ready)
echo.

call npm run dev
