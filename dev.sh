#!/bin/bash
# Development startup script for Selection Assistant

echo "🔧 Building main process first..."
npm run build:main

echo "🚀 Starting development environment..."
echo "   - TypeScript watcher for main process"
echo "   - Vite dev server on http://localhost:5173"
echo "   - Electron app (will start after Vite is ready)"
echo ""

npm run dev
