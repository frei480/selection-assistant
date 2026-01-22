import { BrowserWindow, ipcMain, screen, systemPreferences } from 'electron'
import { join } from 'path'
import type { TextSelectionData, ActionItem } from '@shared/types'
import { IpcChannel } from '@shared/ipcChannels'
import { ConfigManager } from './ConfigManager'
import { Logger } from './Logger'

const logger = new Logger('SelectionService')

type SelectionHookConstructor = typeof import('selection-hook').default
type SelectionHookInstance = InstanceType<SelectionHookConstructor>

type Point = { x: number; y: number }
type RelativeOrientation = 'topLeft' | 'topRight' | 'topMiddle' | 'bottomLeft' | 'bottomRight' | 'bottomMiddle' | 'middleLeft' | 'middleRight' | 'center'

enum TriggerMode {
  Selection = 'selection',
  Ctrlkey = 'ctrlkey',
  Shortcut = 'shortcut',
}

const isDev = process.env.NODE_ENV === 'development'
const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'
const isSupportedOS = isWin || isMac

let SelectionHook: SelectionHookConstructor | null = null
try {
  if (isSupportedOS) {
    SelectionHook = require('selection-hook')
  }
} catch (error) {
  console.error('Failed to load selection-hook:', error)
}

export class SelectionService {
  private static instance: SelectionService | null = null
  private selectionHook: SelectionHookInstance | null = null
  private static isIpcHandlerRegistered = false

  private initStatus: boolean = false
  private started: boolean = false

  private triggerMode = TriggerMode.Selection
  private isFollowToolbar = true
  private isRememberWinSize = false
  private filterMode: 'default' | 'whitelist' | 'blacklist' = 'default'
  private filterList: string[] = []

  private toolbarWindow: BrowserWindow | null = null
  private actionWindows = new Set<BrowserWindow>()
  private preloadedActionWindows: BrowserWindow[] = []
  private readonly PRELOAD_ACTION_WINDOW_COUNT = 1

  private isHideByMouseKeyListenerActive: boolean = false

  private zoomFactor: number = 1

  private readonly TOOLBAR_WIDTH = 350
  private readonly TOOLBAR_HEIGHT = 43

  private readonly ACTION_WINDOW_WIDTH = 500
  private readonly ACTION_WINDOW_HEIGHT = 400

  private lastActionWindowSize: { width: number; height: number } = {
    width: this.ACTION_WINDOW_WIDTH,
    height: this.ACTION_WINDOW_HEIGHT,
  }

  private toolbarWidth: number = this.TOOLBAR_WIDTH
  private toolbarHeight: number = this.TOOLBAR_HEIGHT

  private constructor(private configManager: ConfigManager) {
    console.log('[SelectionService] Constructor called')
    logger.info('SelectionService constructor called')
    try {
      console.log(`[SelectionService] SelectionHook available: ${!!SelectionHook}`)
      if (!SelectionHook) {
        throw new Error('module selection-hook not available')
      }

      console.log('[SelectionService] Creating SelectionHook instance...')
      logger.info('Creating SelectionHook instance...')
      this.selectionHook = new SelectionHook()
      console.log(`[SelectionService] SelectionHook created: ${!!this.selectionHook}`)
      logger.info(`SelectionHook created: ${!!this.selectionHook}`)
      
      if (this.selectionHook) {
        this.initZoomFactor()
        this.initStatus = true
        console.log('[SelectionService] SelectionService initialized successfully')
        logger.info('SelectionService initialized successfully')
      }
    } catch (error) {
      console.error('[SelectionService] Constructor error:', error)
      logger.error('Failed to initialize SelectionService:', error as Error)
    }
  }

  public static getInstance(configManager: ConfigManager): SelectionService | null {
    logger.info(`getInstance called - isSupportedOS=${isSupportedOS}`)
    
    if (!isSupportedOS) {
      logger.error(`getInstance: not supported on ${process.platform}`)
      return null
    }

    if (!SelectionService.instance) {
      logger.info('Creating new SelectionService instance...')
      SelectionService.instance = new SelectionService(configManager)
    }

    if (SelectionService.instance.initStatus) {
      logger.info('getInstance returning valid instance')
      return SelectionService.instance
    }
    
    logger.error('getInstance: initStatus is false')
    return null
  }

  private initZoomFactor(): void {
    const zoomFactor = (this.configManager.get('compactMode') ? 0.9 : 1) || 1
    this.setZoomFactor(zoomFactor)
  }

  public setZoomFactor = (zoomFactor: number) => {
    this.zoomFactor = zoomFactor
  }

  private initConfig(): void {
    this.triggerMode = (this.configManager.get('triggerMode') as TriggerMode) || TriggerMode.Selection
    this.isFollowToolbar = this.configManager.get('followToolbar') !== false
    this.isRememberWinSize = this.configManager.get('rememberWindowSize') || false
    this.filterMode = (this.configManager.get('filterMode') as 'default' | 'whitelist' | 'blacklist') || 'default'
    this.filterList = (this.configManager.get('filterList') as string[]) || []

    this.setHookGlobalFilterMode(this.filterMode, this.filterList)
    this.processTriggerMode()
  }

  private setHookGlobalFilterMode(mode: 'default' | 'whitelist' | 'blacklist', list: string[]): void {
    if (!this.selectionHook) return

    const modeMap = {
      default: 0 as const,
      whitelist: 1 as const,
      blacklist: 2 as const,
    }

    let combinedList: string[] = list
    let combinedMode = mode

    if (this.triggerMode === TriggerMode.Selection) {
      switch (mode) {
        case 'blacklist':
          combinedList = [...new Set([...list])]
          break
        case 'whitelist':
          combinedList = [...list]
          break
        case 'default':
        default:
          combinedList = []
          combinedMode = 'blacklist'
          break
      }
    }

    const modeValue = modeMap[combinedMode]
    if (!this.selectionHook.setGlobalFilterMode(modeValue, combinedList)) {
      logger.error('Failed to set selection-hook global filter mode')
    }
  }

  public start(): boolean {
    console.log('[SelectionService.start] Called')
    
    if (!isSupportedOS) {
      console.error(`[SelectionService.start] Not supported on ${process.platform}`)
      logger.error('SelectionService start(): not supported on this OS')
      return false
    }

    console.log('[SelectionService.start] OS is supported')

    if (!this.selectionHook) {
      console.error('[SelectionService.start] selectionHook is null')
      logger.error('SelectionService start(): instance is null')
      return false
    }

    console.log('[SelectionService.start] SelectionHook exists')

    if (this.started) {
      console.error('[SelectionService.start] Already started')
      logger.error('SelectionService start(): already started')
      return false
    }

    logger.info('SelectionService.start() called - initializing...')

    if (isMac) {
      if (!systemPreferences.isTrustedAccessibilityClient(false)) {
        console.error('[SelectionService.start] macOS accessibility check failed')
        logger.error('SelectionService not started: process is not trusted on macOS')
        return false
      }
      console.log('[SelectionService.start] macOS accessibility check passed')
      logger.info('macOS accessibility check passed')
    }

    try {
      console.log('[SelectionService.start] Creating toolbar window...')
      logger.info('Creating toolbar window...')
      this.createToolbarWindow()
      this.initPreloadedActionWindows()

      this.selectionHook.on('error', (error: any) => {
        console.error('[SelectionService] SelectionHook error:', error)
        logger.error('Error in SelectionHook:', error)
      })

      this.selectionHook.on('text-selection', (data: TextSelectionData) => {
        console.log('[SelectionService] === TEXT SELECTION EVENT ===')
        console.log(`[SelectionService] Text: "${data.text.substring(0, 50)}"`)
        console.log(`[SelectionService] Position: (${data.mousePosStart.x}, ${data.mousePosStart.y})`)
        console.log(`[SelectionService] Program: ${data.programName}`)
        console.log(`[SelectionService] PosLevel: ${data.posLevel}`)
        logger.info(`Text selected from ${data.programName}: "${data.text.substring(0, 30)}..."`)
        this.processTextSelection(data)
      })

      console.log('[SelectionService.start] Starting selection hook...')
      logger.info('Starting selection hook...')
      
      const hookStartResult = this.selectionHook.start({ debug: isDev })
      console.log(`[SelectionService.start] selectionHook.start() returned: ${hookStartResult}`)
      
      if (hookStartResult) {
        this.initConfig()
        this.started = true
        console.log('[SelectionService.start] SelectionService started successfully')
        logger.info('SelectionService Started successfully')
        return true
      }

      console.error('[SelectionService.start] Failed to start text selection hook')
      logger.error('Failed to start text selection hook.')
      return false
    } catch (error) {
      console.error('[SelectionService.start] Exception:', error)
      logger.error('Failed to set up text selection hook:', error as Error)
      return false
    }
  }

  public stop(): boolean {
    if (!this.selectionHook) return false

    this.selectionHook.stop()
    this.selectionHook.cleanup()

    this.isHideByMouseKeyListenerActive = false

    if (this.toolbarWindow) {
      this.toolbarWindow.close()
      this.toolbarWindow = null
    }

    this.closePreloadedActionWindows()

    this.started = false
    logger.info('SelectionService Stopped')
    return true
  }

  public quit(): void {
    if (!this.selectionHook) return

    this.stop()

    this.selectionHook = null
    this.initStatus = false
    SelectionService.instance = null
    logger.info('SelectionService Quitted')
  }

  public toggleEnabled(enabled?: boolean): void {
    if (!this.selectionHook) return

    const newEnabled = enabled === undefined ? !this.started : enabled

    if (newEnabled) {
      this.start()
    } else {
      this.stop()
    }
  }

  private createToolbarWindow(readyCallback?: () => void): void {
    console.log('[createToolbarWindow] Called')
    
    if (this.isToolbarAlive()) {
      console.log('[createToolbarWindow] Toolbar already alive, skipping')
      return
    }

    const toolbarWidth = this.TOOLBAR_WIDTH * this.zoomFactor
    const toolbarHeight = this.TOOLBAR_HEIGHT * this.zoomFactor

    console.log(`[createToolbarWindow] Creating toolbar: ${Math.ceil(toolbarWidth)}x${Math.ceil(toolbarHeight)}`)
    logger.info(`Creating toolbar window: ${toolbarWidth}x${toolbarHeight}`)

    this.toolbarWindow = new BrowserWindow({
      width: Math.ceil(toolbarWidth),
      height: Math.ceil(toolbarHeight),
      x: -Math.ceil(toolbarWidth),  // Start outside screen
      y: -Math.ceil(toolbarHeight),  // Start outside screen
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      autoHideMenuBar: true,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      movable: true,
      hasShadow: false,
      thickFrame: false,
      type: isWin ? 'toolbar' : 'panel',
      focusable: false,
      // Ensure this window is independent and floats above other apps
      ...(isWin ? { 
        // Windows specific: Keep it independent
      } : {
        // macOS specific settings
        hiddenInMissionControl: true,
      }),
      webPreferences: {
        preload: join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        devTools: isDev,
      },
    })

    this.toolbarWindow.on('blur', () => {
      console.log('[toolbarWindow.blur] Toolbar lost focus')
      if (this.toolbarWindow?.isVisible()) {
        this.hideToolbar()
      }
    })

    this.toolbarWindow.on('closed', () => {
      console.log('[toolbarWindow.closed] Toolbar closed')
      if (!this.toolbarWindow?.isDestroyed()) {
        this.toolbarWindow?.destroy()
      }
      this.toolbarWindow = null
    })

    this.toolbarWindow.on('show', () => {
      console.log('[toolbarWindow.show] Toolbar shown')
      this.toolbarWindow?.webContents.send(IpcChannel.Selection_ToolbarVisibilityChange, true)
    })

    this.toolbarWindow.on('hide', () => {
      console.log('[toolbarWindow.hide] Toolbar hidden')
      this.toolbarWindow?.webContents.send(IpcChannel.Selection_ToolbarVisibilityChange, false)
    })

    this.toolbarWindow.on('ready-to-show', () => {
      console.log('[toolbarWindow.ready-to-show] Toolbar ready')
    })

    this.toolbarWindow.webContents.on('crashed', () => {
      console.error('[toolbarWindow] WebContents crashed')
    })

    this.toolbarWindow.webContents.on('unresponsive', () => {
      console.error('[toolbarWindow] WebContents unresponsive')
    })

    this.toolbarWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
      console.error(`[toolbarWindow.did-fail-load] Error ${errorCode}: ${errorDesc}`)
    })

    this.toolbarWindow.webContents.on('console-message', (level, message, line, sourceId) => {
      console.log(`[toolbarWindow.console] [${level}] ${message} (${sourceId}:${line})`)
    })

    if (readyCallback) {
      this.toolbarWindow.once('ready-to-show', readyCallback)
    }

    const selectionToolbarPath = join(__dirname, '../../renderer/selection-toolbar.html')
    const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173'
    
    console.log(`[createToolbarWindow] Loading URL - isDev: ${isDev}`)
    console.log(`[createToolbarWindow] VITE_DEV_SERVER_URL: ${VITE_DEV_SERVER_URL}`)
    logger.info(`Loading toolbar - isDev: ${isDev}`)
    logger.info(`Vite URL: ${VITE_DEV_SERVER_URL}`)
    logger.info(`Toolbar path: ${selectionToolbarPath}`)
    
    if (isDev) {
      const url = `${VITE_DEV_SERVER_URL}/selection-toolbar.html`
      console.log(`[createToolbarWindow] Loading from dev server: ${url}`)
      logger.info(`Loading toolbar from dev server: ${url}`)
      this.toolbarWindow?.loadURL(url)
    } else {
      console.log(`[createToolbarWindow] Loading from file: ${selectionToolbarPath}`)
      logger.info(`Loading toolbar from file: ${selectionToolbarPath}`)
      this.toolbarWindow?.loadFile(selectionToolbarPath)
    }
    
    console.log('[createToolbarWindow] Window created and URL loaded')
  }

  private calculateToolbarPosition(point: Point, orientation: RelativeOrientation): Point {
    // Use dynamic toolbar size (set by React component)
    const toolbarWidth = this.toolbarWidth
    const toolbarHeight = this.toolbarHeight
    
    // Get screen info
    const display = screen.getDisplayNearestPoint(point)
    const workArea = display.workArea
    
    let x = point.x
    let y = point.y
    
    // Adjust position based on orientation
    switch (orientation) {
      case 'bottomMiddle':
        x = point.x - toolbarWidth / 2
        y = point.y
        break
      case 'topMiddle':
        x = point.x - toolbarWidth / 2
        y = point.y - toolbarHeight
        break
      case 'topRight':
        x = point.x
        y = point.y - toolbarHeight
        break
      case 'topLeft':
        x = point.x - toolbarWidth
        y = point.y - toolbarHeight
        break
    }
    
    // Clamp to screen boundaries with 10px margin
    const margin = 10
    
    if (x < workArea.x + margin) {
      x = workArea.x + margin
    }
    if (x + toolbarWidth > workArea.x + workArea.width - margin) {
      x = workArea.x + workArea.width - toolbarWidth - margin
    }
    
    if (y < workArea.y + margin) {
      y = workArea.y + margin
    }
    if (y + toolbarHeight > workArea.y + workArea.height - margin) {
      y = workArea.y + workArea.height - toolbarHeight - margin
    }
    
    return { x, y }
  }

  private showToolbarAtPosition(point: Point, orientation: RelativeOrientation): void {
    logger.info(`showToolbarAtPosition called: point=(${point.x}, ${point.y}), orientation=${orientation}`)
    
    if (!this.isToolbarAlive()) {
      logger.info('Toolbar not alive, creating new one...')
      this.createToolbarWindow(() => {
        this.showToolbarAtPosition(point, orientation)
      })
      return
    }

    // Calculate position with boundary checking
    const calculatedPos = this.calculateToolbarPosition(point, orientation)
    const posX = Math.ceil(calculatedPos.x)
    const posY = Math.ceil(calculatedPos.y)

    const toolbarWidth = this.toolbarWidth
    const toolbarHeight = this.toolbarHeight

    console.log(`[showToolbarAtPosition] Calculated position: (${posX}, ${posY})`)
    logger.info(`Setting toolbar bounds: ${Math.ceil(toolbarWidth)}x${Math.ceil(toolbarHeight)} at (${posX}, ${posY})`)

    // Set bounds first
    this.toolbarWindow!.setBounds({
      width: Math.ceil(toolbarWidth),
      height: Math.ceil(toolbarHeight),
      x: posX,
      y: posY,
    })

    // CRITICAL: Set AlwaysOnTop BEFORE showing
    console.log('[showToolbarAtPosition] Setting alwaysOnTop with screen-saver')
    this.toolbarWindow!.setAlwaysOnTop(true, 'screen-saver')

    if (!isMac) {
      logger.info('Windows: showing toolbar')
      console.log('[showToolbarAtPosition] Windows: showing toolbar at', { posX, posY })
      
      // Show the window
      this.toolbarWindow!.show()
      
      // Bring to front after show
      this.toolbarWindow!.moveTop()
      
      // Delay listener activation to prevent immediate hide on selection event
      setTimeout(() => {
        console.log('[showToolbarAtPosition] Starting hide listener after delay')
        this.startHideByMouseKeyListener()
      }, 500)
      return
    }

    logger.info('macOS: showing toolbar with special settings')
    this.toolbarWindow!.setFocusable(false)
    this.toolbarWindow!.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true,
    })

    this.toolbarWindow!.showInactive()
    this.toolbarWindow!.moveTop()
    this.toolbarWindow!.setFocusable(true)
    this.startHideByMouseKeyListener()
  }

  public hideToolbar(): void {
    if (!this.isToolbarAlive()) return

    this.stopHideByMouseKeyListener()

    if (!isMac) {
      this.toolbarWindow!.hide()
      return
    }

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

    setTimeout(() => {
      for (const window of focusableWindows) {
        if (!window.isDestroyed()) {
          window.setFocusable(true)
        }
      }
    }, 50)

    this.toolbarWindow!.webContents.sendInputEvent({
      type: 'mouseMove',
      x: -1,
      y: -1,
    })
  }

  private isToolbarAlive(): boolean {
    return !!(this.toolbarWindow && !this.toolbarWindow.isDestroyed())
  }

  public determineToolbarSize(width: number, height: number): void {
    console.log(`[determineToolbarSize] Received: ${width}x${height}`)
    
    if (!this.isToolbarAlive()) {
      console.log('[determineToolbarSize] Toolbar not alive, skipping')
      return
    }

    // Update stored dimensions
    this.toolbarWidth = width
    this.toolbarHeight = height
    
    console.log(`[determineToolbarSize] Updated toolbar size: ${this.toolbarWidth}x${this.toolbarHeight}`)
    
    // Update window bounds with new size (keep current position)
    if (this.toolbarWindow) {
      const bounds = this.toolbarWindow.getBounds()
      console.log(`[determineToolbarSize] Current bounds: ${bounds.width}x${bounds.height} at (${bounds.x}, ${bounds.y})`)
      
      // Recalculate position to center on cursor with new size
      const cursorPoint = screen.getCursorScreenPoint()
      console.log(`[determineToolbarSize] Cursor at: (${cursorPoint.x}, ${cursorPoint.y})`)
      
      const newPos = this.calculateToolbarPosition(cursorPoint, 'bottomMiddle')
      
      // Set new bounds with correct size
      this.toolbarWindow.setBounds({
        width: Math.ceil(width),
        height: Math.ceil(height),
        x: Math.ceil(newPos.x),
        y: Math.ceil(newPos.y),
      })
      
      console.log(`[determineToolbarSize] Updated bounds to: ${Math.ceil(width)}x${Math.ceil(height)} at (${Math.ceil(newPos.x)}, ${Math.ceil(newPos.y)})`)
    }
  }

  private processTextSelection = (selectionData: TextSelectionData) => {
    console.log(`[processTextSelection] Text: "${selectionData.text.substring(0, 50)}"`)
    console.log(`[processTextSelection] Toolbar alive: ${this.isToolbarAlive()}, visible: ${this.toolbarWindow?.isVisible()}`)
    
    if (!selectionData.text || (this.isToolbarAlive() && this.toolbarWindow!.isVisible())) {
      console.log('[processTextSelection] Skipping: no text or toolbar already visible')
      return
    }

    const cursorPoint = screen.getCursorScreenPoint()
    console.log(`[processTextSelection] Cursor at: (${cursorPoint.x}, ${cursorPoint.y})`)
    
    const refPoint = cursorPoint
    const refOrientation: RelativeOrientation = 'bottomMiddle'

    console.log('[processTextSelection] Calling showToolbarAtPosition...')
    this.showToolbarAtPosition(refPoint, refOrientation)
    
    console.log('[processTextSelection] Sending TextSelected event...')
    this.toolbarWindow!.webContents.send(IpcChannel.Selection_TextSelected, selectionData)
  }

  private startHideByMouseKeyListener(): void {
    try {
      if (this.selectionHook) {
        this.selectionHook.on('mouse-down', this.handleMouseDownHide)
        this.selectionHook.on('mouse-wheel', this.handleMouseWheelHide)
        this.selectionHook.on('key-down', this.handleKeyDownHide)
        this.isHideByMouseKeyListenerActive = true
      }
    } catch (error) {
      logger.error('Failed to start global mouse event listener:', error as Error)
    }
  }

  private stopHideByMouseKeyListener(): void {
    if (!this.isHideByMouseKeyListenerActive) return

    try {
      if (this.selectionHook) {
        this.selectionHook.off('mouse-down', this.handleMouseDownHide)
        this.selectionHook.off('mouse-wheel', this.handleMouseWheelHide)
        this.selectionHook.off('key-down', this.handleKeyDownHide)
        this.isHideByMouseKeyListenerActive = false
      }
    } catch (error) {
      logger.error('Failed to stop global mouse event listener:', error as Error)
    }
  }

  private handleMouseWheelHide = () => {
    this.hideToolbar()
  }

  private handleMouseDownHide = (data: any) => {
    if (!this.isToolbarAlive()) {
      return
    }

    const mousePoint = isMac ? { x: data.x, y: data.y } : screen.screenToDipPoint({ x: data.x, y: data.y })
    const bounds = this.toolbarWindow!.getBounds()

    const isInsideToolbar =
      mousePoint.x >= bounds.x && mousePoint.x <= bounds.x + bounds.width && mousePoint.y >= bounds.y && mousePoint.y <= bounds.y + bounds.height

    if (!isInsideToolbar) {
      this.hideToolbar()
    }
  }

  private handleKeyDownHide = () => {
    this.hideToolbar()
  }

  private createPreloadedActionWindow(): BrowserWindow {
    const preloadedActionWindow = new BrowserWindow({
      width: this.isRememberWinSize ? this.lastActionWindowSize.width : this.ACTION_WINDOW_WIDTH,
      height: this.isRememberWinSize ? this.lastActionWindowSize.height : this.ACTION_WINDOW_HEIGHT,
      minWidth: 300,
      minHeight: 200,
      frame: false,
      transparent: true,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      hasShadow: false,
      thickFrame: false,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload.ts'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: true,
      },
    })

    const resultPath = join(__dirname, '../../renderer/result.html')
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      preloadedActionWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}result.html`)
    } else {
      preloadedActionWindow.loadFile(resultPath)
    }

    return preloadedActionWindow
  }

  private async initPreloadedActionWindows(): Promise<void> {
    try {
      for (let i = 0; i < this.PRELOAD_ACTION_WINDOW_COUNT; i++) {
        await this.pushNewActionWindow()
      }
    } catch (error) {
      logger.error('Failed to initialize preloaded windows:', error as Error)
    }
  }

  private closePreloadedActionWindows(): void {
    for (const actionWindow of this.preloadedActionWindows) {
      if (!actionWindow.isDestroyed()) {
        actionWindow.destroy()
      }
    }
    this.preloadedActionWindows = []
  }

  private async pushNewActionWindow(): Promise<void> {
    try {
      const actionWindow = this.createPreloadedActionWindow()
      this.preloadedActionWindows.push(actionWindow)
    } catch (error) {
      logger.error('Failed to push new action window:', error as Error)
    }
  }

  private popActionWindow(): BrowserWindow {
    const actionWindow = this.preloadedActionWindows.pop() || this.createPreloadedActionWindow()

    actionWindow.on('closed', () => {
      this.actionWindows.delete(actionWindow)
      if (!actionWindow.isDestroyed()) {
        actionWindow.destroy()
      }
    })

    actionWindow.on('resized', () => {
      if (this.isRememberWinSize) {
        this.lastActionWindowSize = {
          width: actionWindow.getBounds().width,
          height: actionWindow.getBounds().height,
        }
      }
    })

    this.actionWindows.add(actionWindow)
    this.pushNewActionWindow()

    return actionWindow
  }

  public processAction(actionItem: ActionItem): void {
    const actionWindow = this.popActionWindow()

    actionWindow.webContents.send(IpcChannel.Selection_UpdateActionData, actionItem)
    this.showActionWindow(actionWindow)
  }

  private showActionWindow(actionWindow: BrowserWindow): void {
    let actionWindowWidth = this.ACTION_WINDOW_WIDTH
    let actionWindowHeight = this.ACTION_WINDOW_HEIGHT

    if (this.isRememberWinSize) {
      actionWindowWidth = this.lastActionWindowSize.width
      actionWindowHeight = this.lastActionWindowSize.height
    }

    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const workArea = display.workArea

    if (!this.isFollowToolbar || !this.toolbarWindow) {
      const centerX = Math.round(workArea.x + (workArea.width - actionWindowWidth) / 2)
      const centerY = Math.round(workArea.y + (workArea.height - actionWindowHeight) / 2)

      actionWindow.setPosition(centerX, centerY, false)
      actionWindow.setBounds({
        width: actionWindowWidth,
        height: actionWindowHeight,
        x: centerX,
        y: centerY,
      })
    } else {
      const toolbarBounds = this.toolbarWindow!.getBounds()
      const GAP = 6

      if (actionWindowWidth > workArea.width - 2 * GAP) {
        actionWindowWidth = workArea.width - 2 * GAP
      }

      if (actionWindowHeight > workArea.height - 2 * GAP) {
        actionWindowHeight = workArea.height - 2 * GAP
      }

      let posX = Math.round(toolbarBounds.x + (toolbarBounds.width - actionWindowWidth) / 2)
      let posY = Math.round(toolbarBounds.y)

      if (posX + actionWindowWidth > workArea.x + workArea.width) {
        posX = workArea.x + workArea.width - actionWindowWidth - GAP
      } else if (posX < workArea.x) {
        posX = workArea.x + GAP
      }

      if (posY + actionWindowHeight > workArea.y + workArea.height) {
        posY = workArea.y + workArea.height - actionWindowHeight - GAP
      } else if (posY < workArea.y) {
        posY = workArea.y + GAP
      }

      actionWindow.setPosition(posX, posY, false)
      actionWindow.setBounds({
        width: actionWindowWidth,
        height: actionWindowHeight,
        x: posX,
        y: posY,
      })
    }

    actionWindow.show()
  }

  public closeActionWindow(actionWindow: BrowserWindow): void {
    actionWindow.close()
  }

  public minimizeActionWindow(actionWindow: BrowserWindow): void {
    actionWindow.minimize()
  }

  public pinActionWindow(actionWindow: BrowserWindow, isPinned: boolean): void {
    actionWindow.setAlwaysOnTop(isPinned)
  }

  private processTriggerMode(): void {
    if (!this.selectionHook) return

    switch (this.triggerMode) {
      case TriggerMode.Selection:
        this.selectionHook.setSelectionPassiveMode(false)
        break
      case TriggerMode.Ctrlkey:
        this.selectionHook.setSelectionPassiveMode(true)
        break
      case TriggerMode.Shortcut:
        this.selectionHook.setSelectionPassiveMode(true)
        break
    }
  }

  public writeToClipboard(text: string): boolean {
    if (!this.selectionHook || !this.started) return false
    return this.selectionHook.writeToClipboard(text)
  }

  public static registerIpcHandler(selectionService: SelectionService | null): void {
    if (this.isIpcHandlerRegistered) return

    ipcMain.handle(IpcChannel.Selection_ToolbarHide, () => {
      selectionService?.hideToolbar()
    })

    ipcMain.handle(IpcChannel.Selection_WriteToClipboard, (_, text: string): boolean => {
      return selectionService?.writeToClipboard(text) ?? false
    })

    ipcMain.handle(IpcChannel.Selection_ToolbarDetermineSize, (_, width: number, height: number) => {
      selectionService?.determineToolbarSize(width, height)
    })

    ipcMain.handle(IpcChannel.Selection_ProcessAction, (_, actionItem: ActionItem) => {
      selectionService?.processAction(actionItem)
    })

    ipcMain.handle(IpcChannel.Selection_ActionWindowClose, (event) => {
      const actionWindow = BrowserWindow.fromWebContents(event.sender)
      if (actionWindow) {
        selectionService?.closeActionWindow(actionWindow)
      }
    })

    ipcMain.handle(IpcChannel.Selection_ActionWindowMinimize, (event) => {
      const actionWindow = BrowserWindow.fromWebContents(event.sender)
      if (actionWindow) {
        selectionService?.minimizeActionWindow(actionWindow)
      }
    })

    ipcMain.handle(IpcChannel.Selection_ActionWindowPin, (event, isPinned: boolean) => {
      const actionWindow = BrowserWindow.fromWebContents(event.sender)
      if (actionWindow) {
        selectionService?.pinActionWindow(actionWindow, isPinned)
      }
    })

    this.isIpcHandlerRegistered = true
  }
}

let selectionServiceInstance: SelectionService | null = null

export function initSelectionService(configManager: ConfigManager): boolean {
  logger.info('=== initSelectionService called ===')
  
  if (!isSupportedOS) {
    logger.error(`SelectionService not supported: OS is ${process.platform}`)
    return false
  }

  logger.info(`Creating SelectionService instance... (isSupportedOS=${isSupportedOS})`)
  const selectionService = SelectionService.getInstance(configManager)
  if (!selectionService) {
    logger.error('SelectionService not initialized: instance is null')
    return false
  }

  logger.info('SelectionService instance created successfully')
  selectionServiceInstance = selectionService
  SelectionService.registerIpcHandler(selectionService)

  const triggerMode = (configManager.get('triggerMode') as string) || 'selection'
  logger.info(`Trigger mode: "${triggerMode}"`)
  
  // Enable SelectionService if trigger mode is 'selection' (text selection mode)
  const enabled = triggerMode === 'selection'
  logger.info(`SelectionService enabled: ${enabled}`)
  
  if (enabled) {
    logger.info('Starting SelectionService...')
    const result = selectionService.start()
    logger.info(`SelectionService.start() returned: ${result}`)
    return result
  }

  logger.info(`SelectionService not started: triggerMode is '${triggerMode}' (requires 'selection')`)
  return false
}

export function quitSelectionService(): void {
  if (selectionServiceInstance) {
    selectionServiceInstance.quit()
  }
}

export function getSelectionService(): SelectionService | null {
  return selectionServiceInstance
}
