# Selection Assistant Development Guide

## Project Overview
This is a standalone Electron application for text selection with AI integration via LM Studio. Built with TypeScript, React, and Vite.

## Key Features
- **Settings Management**: Persistent configuration storage with electron-store
- **LM Studio Integration**: Connect to local AI models for text processing
- **IPC Communication**: Type-safe main-renderer process communication
- **React UI**: Modern interface with Ant Design components

## Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Project Structure

### Main Process (`src/main/`)
- `index.ts` - Application entry point
- `preload.ts` - Secure IPC bridge
- `services/` - Business logic
  - `ConfigManager.ts` - Settings persistence
  - `LMStudioService.ts` - AI integration
  - `Logger.ts` - Logging utilities

### Renderer Process (`src/renderer/`)
- `App.tsx` - Main app component with routing
- `pages/` - Page components
  - `MainPage.tsx` - Dashboard
  - `SettingsPage.tsx` - Settings form

### Shared (`src/shared/`)
- `types.ts` - TypeScript interfaces
- `ipcChannels.ts` - IPC channel definitions

## Configuration

Settings are stored in `~/.config/selection-assistant/` (Linux/Mac) or `%APPDATA%/selection-assistant/` (Windows).

### LM Studio Setup
1. Install [LM Studio](https://lmstudio.ai/)
2. Load a model and start the local server
3. Configure in Settings:
   - Host: `localhost`
   - Port: `1234`
   - API Path: `/v1`
   - Model: Select from list

## Available Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development servers |
| `npm run build` | Build for production |
| `npm run type-check` | Type checking |
| `npm run start` | Run built app |

## Next Steps for Enhancement

### Phase 1: Text Selection
- Integrate `selection-hook` for global text detection
- Display floating toolbar on text selection
- Handle multi-screen scenarios

### Phase 2: Actions
- Define action types (copy, search, translate)
- Implement action handlers
- Create action window management

### Phase 3: Features
- Translation with LM Studio
- Text summarization
- Custom prompt templates
- Keyboard shortcut configuration

## Debugging

- Main process: Electron DevTools (built-in)
- Renderer process: React DevTools
- Enable debugging in `src/main/index.ts` (uncomment lines)

## Notes

- Keep IPC channels type-safe via `ipcChannels.ts`
- Settings auto-save on change
- All paths use `path.resolve()` for cross-platform support
- Preload script sandboxes main process access
