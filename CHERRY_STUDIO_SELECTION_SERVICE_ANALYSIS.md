# Cherry Studio SelectionService.ts - Complete Implementation Guide

## Overview
Cherry Studio's `SelectionService.ts` implements a **floating selection toolbar** that appears above other applications (Word, Notepad, etc.) on Windows and macOS. This is achieved through careful BrowserWindow configuration and platform-specific handling.

---

## 1. TOOLBAR WINDOW CREATION & CONFIGURATION

### BrowserWindow Configuration (Lines 397-430)

```typescript
private createToolbarWindow(readyCallback?: () => void): void {
  if (this.isToolbarAlive()) return

  const { toolbarWidth, toolbarHeight } = this.getToolbarRealSize()

  this.toolbarWindow = new BrowserWindow({
    // Window Dimensions
    width: toolbarWidth,
    height: toolbarHeight,
    show: false,
    
    // Critical for floating behavior
    frame: false,              // No window frame
    transparent: true,         // Transparent background
    alwaysOnTop: true,        // ALWAYS ON TOP - key for floating
    skipTaskbar: true,        // Don't show in taskbar
    autoHideMenuBar: true,
    
    // Prevent resizing/fullscreen
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,    // [macOS] must be false
    
    // Visual settings
    movable: true,            // User can drag it
    hasShadow: false,
    thickFrame: false,
    roundedCorners: true,

    // Platform specific settings
    // [Windows]: Use 'toolbar' type to make it float independently
    ...(isWin ? { 
      type: 'toolbar', 
      focusable: false          // Windows: don't steal focus
    } : { 
      type: 'panel'             // macOS: use panel type
    }),
    
    hiddenInMissionControl: true,  // [macOS only]
    acceptFirstMouse: true,        // [macOS only]

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,      // Secure IPC
      nodeIntegration: false,
      sandbox: false,
      devTools: isDev ? true : false
    }
  })
```

### Key Configuration Insights

| Property | Purpose | Why? |
|----------|---------|------|
| `type: 'toolbar'` (Windows) | Creates a toolbar-style window | Floats above other apps |
| `type: 'panel'` (macOS) | Creates a panel-style window | Floats above other apps on Mac |
| `alwaysOnTop: true` | Window stays on top | Always visible above other windows |
| `frame: false` | No native window frame | Custom UI, smaller footprint |
| `transparent: true` | Transparent background | Seamless floating effect |
| `focusable: false` (Windows) | Window doesn't take focus | Toolbar accessible without stealing focus |
| `skipTaskbar: true` | Hidden from taskbar | Cleaner UI integration |
| `acceptFirstMouse: true` (macOS) | Click through without focus | Better UX on macOS |

---

## 2. WHY IT APPEARS ABOVE OTHER APPLICATIONS

The toolbar floats above Word, Notepad, etc. because of three critical settings:

### A. Window Type
```typescript
// Windows
type: 'toolbar'  // OS-level toolbar window, always on top
focusable: false // Doesn't steal focus from target app

// macOS
type: 'panel'    // Panel window, floats above everything
```

### B. Always On Top Setting
```typescript
this.toolbarWindow!.setAlwaysOnTop(true, 'screen-saver')
// Argument: 'screen-saver' means "always on top of everything"
// Other options: 'floating', 'normal' (only above windows in same app)
```

### C. Visibility Settings (macOS Fullscreen Handling)
```typescript
this.toolbarWindow!.setVisibleOnAllWorkspaces(true, {
  visibleOnFullScreen: true,
  skipTransformProcessType: true
})
```

---

## 3. PRELOAD CONFIGURATION

### Toolbar Preload (Security)
```typescript
webPreferences: {
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,    // Main process isolated from renderer
  nodeIntegration: false,    // No direct Node.js access
  sandbox: false,            // Allows IPC but no file system
  devTools: isDev ? true : false
}
```

### Action Window Preload (More Restrictive)
```typescript
private createPreloadedActionWindow(): BrowserWindow {
  const preloadedActionWindow = new BrowserWindow({
    // ... other settings ...
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,          // More restrictive - full sandbox
      devTools: true
    }
  })
```

### Preload Script Purpose
The preload script at `src/main/preload/index.js` provides:
- Type-safe IPC communication
- Secure access to main process functions
- Limited API exposure to renderer

---

## 4. TOOLBAR UI RENDERING

### Loading the Toolbar HTML
```typescript
// Development mode
if (isDev && process.env['ELECTRON_RENDERER_URL']) {
  this.toolbarWindow.loadURL(
    process.env['ELECTRON_RENDERER_URL'] + '/selectionToolbar.html'
  )
} else {
  // Production mode
  this.toolbarWindow.loadFile(
    join(__dirname, '../renderer/selectionToolbar.html')
  )
}
```

### Window Event Listeners
```typescript
// Hide toolbar when user clicks outside it
this.toolbarWindow.on('blur', () => {
  if (this.toolbarWindow!.isVisible()) {
    this.hideToolbar()
  }
})

// Notify renderer when toolbar visibility changes
this.toolbarWindow.on('show', () => {
  this.toolbarWindow?.webContents.send(
    IpcChannel.Selection_ToolbarVisibilityChange, 
    true
  )
})

this.toolbarWindow.on('hide', () => {
  this.toolbarWindow?.webContents.send(
    IpcChannel.Selection_ToolbarVisibilityChange, 
    false
  )
})

// Clean up when closed
this.toolbarWindow.on('closed', () => {
  if (!this.toolbarWindow?.isDestroyed()) {
    this.toolbarWindow?.destroy()
  }
  this.toolbarWindow = null
})
```

### Toolbar Entry Point (React)
```tsx
// src/renderer/src/windows/selection/toolbar/entryPoint.tsx
import { ThemeProvider } from '@renderer/context/ThemeProvider'
import storeSyncService from '@renderer/services/StoreSyncService'
import store, { persistor } from '@renderer/store'

const App: FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <PersistGate loading={null} persistor={persistor}>
          <SelectionToolbar />
        </PersistGate>
      </ThemeProvider>
    </Provider>
  )
}

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
```

---

## 5. WINDOW LIFECYCLE MANAGEMENT

### Creating and Showing the Toolbar

```typescript
private showToolbarAtPosition(
  point: Point, 
  orientation: RelativeOrientation, 
  programName: string
): void {
  // Recreate if destroyed
  if (!this.isToolbarAlive()) {
    this.createToolbarWindow(() => {
      this.showToolbarAtPosition(point, orientation, programName)
    })
    return
  }

  // Position the window
  const { x: posX, y: posY } = this.calculateToolbarPosition(point, orientation)
  const { toolbarWidth, toolbarHeight } = this.getToolbarRealSize()
  
  this.toolbarWindow!.setPosition(posX, posY, false)
  this.toolbarWindow!.setBounds({
    width: toolbarWidth,
    height: toolbarHeight,
    x: posX,
    y: posY
  })

  // Set to always on top
  this.toolbarWindow!.setAlwaysOnTop(true, 'screen-saver')

  // Platform-specific showing
  if (!isMac) {
    // Windows: simple show with listener
    this.toolbarWindow!.show()
    this.startHideByMouseKeyListener()
    return
  }

  // macOS: complex handling for fullscreen apps
  const isSelf = ['com.github.Electron', 'com.kangfenmao.CherryStudio']
    .includes(programName)

  if (!isSelf) {
    // For external apps, make visible on all workspaces
    this.toolbarWindow!.setFocusable(false)
    this.toolbarWindow!.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })
  }

  // Show inactive so it doesn't steal focus
  this.toolbarWindow!.showInactive()
  this.toolbarWindow!.setFocusable(true)
  this.startHideByMouseKeyListener()
}
```

### Hiding the Toolbar

```typescript
public hideToolbar(): void {
  if (!this.isToolbarAlive()) return

  this.stopHideByMouseKeyListener()

  // Windows: simple hide
  if (!isMac) {
    this.toolbarWindow!.hide()
    return
  }

  // macOS: prevent other windows from coming to front
  const focusableWindows: BrowserWindow[] = []
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && window.isVisible()) {
      if (window.isFocusable()) {
        focusableWindows.push(window)
        window.setFocusable(false)
      }
    }
  }

  this.toolbarWindow!.hide()

  // Restore focusable state
  setTimeout(() => {
    for (const window of focusableWindows) {
      if (!window.isDestroyed()) {
        window.setFocusable(true)
      }
    }
  }, 50)

  // Clear hover state
  this.toolbarWindow!.webContents.sendInputEvent({
    type: 'mouseMove',
    x: -1,
    y: -1
  })
}
```

### Lifecycle Check
```typescript
private isToolbarAlive(): boolean {
  return !!(this.toolbarWindow && !this.toolbarWindow.isDestroyed())
}
```

### Service Initialization
```typescript
public start(): boolean {
  // ... validation checks ...
  
  // Create toolbar window
  this.createToolbarWindow()
  
  // Initialize preloaded action windows
  this.initPreloadedActionWindows()
  
  // Set up selection hook listeners
  this.selectionHook.on('text-selection', this.processTextSelection)
  
  if (this.selectionHook.start({ debug: isDev })) {
    this.initConfig()
    this.processTriggerMode()
    this.started = true
    return true
  }
  
  return false
}

public stop(): boolean {
  this.selectionHook.stop()
  this.selectionHook.cleanup()

  if (this.toolbarWindow) {
    this.toolbarWindow.close()
    this.toolbarWindow = null
  }

  this.closePreloadedActionWindows()
  this.started = false
  return true
}

public quit(): void {
  this.stop()
  this.selectionHook = null
  this.initStatus = false
  SelectionService.instance = null
}
```

---

## 6. POSITIONING & BOUNDARY HANDLING

### Smart Toolbar Positioning
```typescript
private calculateToolbarPosition(
  refPoint: Point, 
  orientation: RelativeOrientation
): Point {
  const posPoint: Point = { x: 0, y: 0 }
  const { toolbarWidth, toolbarHeight } = this.getToolbarRealSize()

  // Calculate based on orientation
  switch (orientation) {
    case 'topLeft':
      posPoint.x = refPoint.x - toolbarWidth
      posPoint.y = refPoint.y - toolbarHeight
      break
    case 'topRight':
      posPoint.x = refPoint.x
      posPoint.y = refPoint.y - toolbarHeight
      break
    case 'topMiddle':
      posPoint.x = refPoint.x - toolbarWidth / 2
      posPoint.y = refPoint.y - toolbarHeight
      break
    // ... other orientations ...
  }

  // Get the display containing the reference point
  const display = screen.getDisplayNearestPoint(refPoint)

  // Ensure toolbar stays within screen boundaries
  posPoint.x = Math.round(
    Math.max(
      display.workArea.x,
      Math.min(
        posPoint.x,
        display.workArea.x + display.workArea.width - toolbarWidth
      )
    )
  )
  
  posPoint.y = Math.round(
    Math.max(
      display.workArea.y,
      Math.min(
        posPoint.y,
        display.workArea.y + display.workArea.height - toolbarHeight
      )
    )
  )

  // Adjust if exceeds top/bottom
  const exceedsTop = posPoint.y < display.workArea.y
  const exceedsBottom = posPoint.y > display.workArea.y + 
                        display.workArea.height - toolbarHeight

  if (exceedsTop) {
    posPoint.y = posPoint.y + 32
  }
  if (exceedsBottom) {
    posPoint.y = posPoint.y - 32
  }

  return posPoint
}
```

---

## 7. MOUSE & KEYBOARD EVENT HANDLING

### Hide Toolbar on External Interaction
```typescript
private startHideByMouseKeyListener(): void {
  this.selectionHook!.on('mouse-down', this.handleMouseDownHide)
  this.selectionHook!.on('mouse-wheel', this.handleMouseWheelHide)
  this.selectionHook!.on('key-down', this.handleKeyDownHide)
  this.isHideByMouseKeyListenerActive = true
}

private handleMouseDownHide = (data: MouseEventData) => {
  if (!this.isToolbarAlive()) return

  // Convert physical to logical coordinates
  const mousePoint = isMac 
    ? { x: data.x, y: data.y } 
    : screen.screenToDipPoint({ x: data.x, y: data.y })

  const bounds = this.toolbarWindow!.getBounds()

  // Check if click is inside toolbar
  const isInsideToolbar =
    mousePoint.x >= bounds.x &&
    mousePoint.x <= bounds.x + bounds.width &&
    mousePoint.y >= bounds.y &&
    mousePoint.y <= bounds.y + bounds.height

  if (!isInsideToolbar) {
    this.hideToolbar()
  }
}

private handleKeyDownHide = (data: KeyboardEventData) => {
  // Keep open for shift/alt (used for selection)
  if (this.isShiftkey(data.vkCode) || this.isAltkey(data.vkCode)) {
    return
  }
  this.hideToolbar()
}
```

---

## 8. ACTION WINDOWS (Secondary Windows)

### Creating Preloaded Action Windows
```typescript
private createPreloadedActionWindow(): BrowserWindow {
  const preloadedActionWindow = new BrowserWindow({
    width: this.ACTION_WINDOW_WIDTH,
    height: this.ACTION_WINDOW_HEIGHT,
    minWidth: 300,
    minHeight: 200,
    frame: false,
    transparent: true,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',           // [macOS]
    trafficLightPosition: { x: 12, y: 9 }, // [macOS]
    hasShadow: false,
    thickFrame: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,                   // More secure
      devTools: true
    }
  })

  // Load action window UI
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    preloadedActionWindow.loadURL(
      process.env['ELECTRON_RENDERER_URL'] + '/selectionAction.html'
    )
  } else {
    preloadedActionWindow.loadFile(
      join(__dirname, '../renderer/selectionAction.html')
    )
  }

  return preloadedActionWindow
}
```

### Window Pool Management
```typescript
private async pushNewActionWindow(): Promise<void> {
  const actionWindow = this.createPreloadedActionWindow()
  this.preloadedActionWindows.push(actionWindow)
}

private popActionWindow(): BrowserWindow {
  // Use preloaded or create new
  const actionWindow = 
    this.preloadedActionWindows.pop() || this.createPreloadedActionWindow()

  // Setup event listeners
  actionWindow.on('closed', () => {
    this.actionWindows.delete(actionWindow)
    // ... cleanup ...
  })

  // Asynchronously create replacement
  this.pushNewActionWindow()

  return actionWindow
}
```

---

## 9. IPC COMMUNICATION

### Registered IPC Handlers
```typescript
public static registerIpcHandler(): void {
  // Toolbar operations
  ipcMain.handle(IpcChannel.Selection_ToolbarHide, () => {
    selectionService?.hideToolbar()
  })

  // Text operations
  ipcMain.handle(
    IpcChannel.Selection_WriteToClipboard, 
    (_, text: string) => {
      return selectionService?.writeToClipboard(text) ?? false
    }
  )

  // Window sizing
  ipcMain.handle(
    IpcChannel.Selection_ToolbarDetermineSize, 
    (_, width: number, height: number) => {
      selectionService?.determineToolbarSize(width, height)
    }
  )

  // Configuration updates
  ipcMain.handle(
    IpcChannel.Selection_SetTriggerMode, 
    (_, triggerMode: string) => {
      configManager.setSelectionAssistantTriggerMode(triggerMode)
    }
  )

  // Action window operations
  ipcMain.handle(
    IpcChannel.Selection_ProcessAction, 
    (_, actionItem: ActionItem, isFullScreen: boolean = false) => {
      selectionService?.processAction(actionItem, isFullScreen)
    }
  )

  // ... more handlers ...
}
```

### Sending Messages to Renderer
```typescript
// Notify of visibility changes
this.toolbarWindow!.webContents.send(
  IpcChannel.Selection_ToolbarVisibilityChange, 
  true
)

// Send selected text data
this.toolbarWindow!.webContents.send(
  IpcChannel.Selection_TextSelected, 
  selectionData
)

// Update action data
actionWindow.webContents.send(
  IpcChannel.Selection_UpdateActionData, 
  actionItem
)
```

---

## 10. CRITICAL DIFFERENCES: FLOATING vs EMBEDDED

### Why It Floats (Not Embedded in Main App)

| Aspect | Cherry Studio | Your Current App |
|--------|---------------|------------------|
| **Window Type** | `toolbar` (Windows), `panel` (macOS) | Regular app window |
| **Always On Top** | ✅ `setAlwaysOnTop(true, 'screen-saver')` | ❌ Only on top of main app |
| **Focus Management** | `focusable: false` on Windows | Takes focus |
| **Taskbar** | `skipTaskbar: true` | Shows in taskbar |
| **Frame** | `frame: false` (no borders) | Full frame |
| **Context** | Runs independently of main app | Part of main app |
| **Visibility** | All workspaces (macOS) | Only current workspace |

---

## 11. SINGLETON PATTERN & INITIALIZATION

### Singleton Implementation
```typescript
export class SelectionService {
  private static instance: SelectionService | null = null

  private constructor() {
    try {
      if (!SelectionHook) {
        throw new Error('module selection-hook not exists')
      }
      this.selectionHook = new SelectionHook()
      if (this.selectionHook) {
        this.initZoomFactor()
        this.initStatus = true
      }
    } catch (error) {
      this.logError('Failed to initialize SelectionService:', error)
    }
  }

  public static getInstance(): SelectionService | null {
    if (!isSupportedOS) return null

    if (!SelectionService.instance) {
      SelectionService.instance = new SelectionService()
    }

    if (SelectionService.instance.initStatus) {
      return SelectionService.instance
    }
    return null
  }
}

// Export singleton instance
const selectionService = SelectionService.getInstance()
export default selectionService
```

### Initialization in Main Process
```typescript
export function initSelectionService(): boolean {
  if (!isSupportedOS) return false

  configManager.subscribe(
    ConfigKeys.SelectionAssistantEnabled, 
    (enabled: boolean) => {
      const ss = SelectionService.getInstance()
      if (ss) {
        enabled ? ss.start() : ss.stop()
      }
    }
  )

  const ss = SelectionService.getInstance()
  return ss?.start() ?? false
}
```

---

## 12. PLATFORM-SPECIFIC HANDLING

### Windows-Specific Code
```typescript
// Use toolbar type for Windows
...(isWin ? { 
  type: 'toolbar', 
  focusable: false 
} : { 
  type: 'panel' 
})

// Window resize bug workaround for Windows
if (isWin) {
  // Handle custom resize manually due to Electron bug
  // See: https://github.com/electron/electron/issues/48554
}

// Show immediately on Windows
if (!isMac) {
  this.toolbarWindow!.show()
  this.startHideByMouseKeyListener()
  return
}
```

### macOS-Specific Code
```typescript
// Check accessibility permissions
if (isMac) {
  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    return false
  }
}

// Set as panel for macOS
type: 'panel'
hiddenInMissionControl: true
acceptFirstMouse: true

// Use showInactive to prevent focus stealing
this.toolbarWindow!.showInactive()
this.toolbarWindow!.setFocusable(true)

// Visible on all workspaces for fullscreen apps
this.toolbarWindow!.setVisibleOnAllWorkspaces(true, {
  visibleOnFullScreen: true,
  skipTransformProcessType: true
})
```

---

## Summary: Key Takeaways

1. **Window Type**: Use `type: 'toolbar'` (Windows) or `type: 'panel'` (macOS) to create floating windows
2. **Always On Top**: `setAlwaysOnTop(true, 'screen-saver')` keeps it above everything
3. **No Focus Stealing**: `focusable: false` prevents focus loss in target application
4. **Transparent & Frameless**: `transparent: true` + `frame: false` for seamless appearance
5. **Independent Lifecycle**: Windows, macOS handle visibility and workspace management separately
6. **Preload Security**: Isolate renderer process with secure preload scripts
7. **Platform Awareness**: Different behavior for Windows vs macOS fullscreen scenarios
8. **Event Handling**: Global mouse/keyboard listeners keep toolbar responsive
9. **Window Pool**: Preload action windows for instant response
10. **IPC Communication**: Type-safe channels for main-renderer communication
