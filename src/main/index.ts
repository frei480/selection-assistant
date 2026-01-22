import 'tsconfig-paths/register'
import path from 'path'

console.log('[MAIN] === Starting main process ===')

// Регистрируем path aliases для runtime
const moduleAlias = require('module-alias')
moduleAlias.addAliases({
  '@main': path.join(__dirname),
  '@shared': path.join(__dirname, '../shared'),
  '@renderer': path.join(__dirname, '../renderer'),
})

console.log('[MAIN] Path aliases registered')

import { app, BrowserWindow, ipcMain } from 'electron'
import { isDevelopment } from './utils'
import { configManager } from './services/ConfigManager'
import { logger } from './services/Logger'
import { lmStudioService } from './services/LMStudioService'
import { initSelectionService, quitSelectionService } from './services/SelectionService'
import { IpcChannel } from '../shared/ipcChannels'
import type { SettingsConfig, ResultWindowOptions } from '../shared/types'

console.log('[MAIN] All imports loaded')

let mainWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let resultWindow: BrowserWindow | null = null

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173'

  logger.info(`NODE_ENV: ${process.env.NODE_ENV}`)
  logger.info(`isDevelopment: ${isDevelopment}`)
  logger.info(`VITE_DEV_SERVER_URL: ${VITE_DEV_SERVER_URL}`)

  if (isDevelopment) {
    logger.info(`Loading from dev server: ${VITE_DEV_SERVER_URL}`)
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html')
    logger.info(`Loading from file: ${indexPath}`)
    mainWindow.loadFile(indexPath)
  }
}

const createSettingsWindow = (): void => {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 700,
    height: 600,
    minWidth: 500,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173'

  if (isDevelopment) {
    settingsWindow.loadURL(`${VITE_DEV_SERVER_URL}/#/settings`)
    settingsWindow.webContents.openDevTools()
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: '/settings',
    })
  }
}

const createResultWindow = (options: any): void => {
  if (resultWindow) {
    resultWindow.focus()
    return
  }

  resultWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  resultWindow.on('closed', () => {
    resultWindow = null
  })

  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'] || 'http://localhost:5173'

  // Передаем данные результата через query параметры
  const resultData = encodeURIComponent(JSON.stringify(options))
  const url = isDevelopment
    ? `${VITE_DEV_SERVER_URL}/#/result?data=${resultData}`
    : `file://${path.join(__dirname, '../renderer/index.html')}#/result?data=${resultData}`

  if (isDevelopment) {
    resultWindow.loadURL(url)
    resultWindow.webContents.openDevTools()
  } else {
    resultWindow.loadFile(path.join(__dirname, '../renderer/index.html'), {
      hash: `/result?data=${resultData}`,
    })
  }
}

// Register IPC handlers
const registerIpcHandlers = (): void => {
  // Settings handlers
  ipcMain.handle(IpcChannel.Settings_Get, async (): Promise<SettingsConfig> => {
    return configManager.getAll()
  })

  ipcMain.handle(
    IpcChannel.Settings_Set,
    async (
      _,
      key: keyof SettingsConfig,
      value: any
    ): Promise<void> => {
      configManager.set(key, value)
      logger.info(`Settings updated: ${String(key)}`)
    }
  )

  ipcMain.handle(IpcChannel.Settings_Reset, async (): Promise<void> => {
    configManager.reset()
    logger.info('Settings reset to defaults')
  })

  // LM Studio handlers
  ipcMain.handle(IpcChannel.LMStudio_TestConnection, async (): Promise<boolean> => {
    return lmStudioService.testConnection()
  })

  ipcMain.handle(IpcChannel.LMStudio_GetModels, async (): Promise<string[]> => {
    return lmStudioService.getModels()
  })

  ipcMain.handle(
    IpcChannel.LMStudio_GenerateCompletion,
    async (_, prompt: string): Promise<string> => {
      return lmStudioService.generateCompletion(prompt)
    }
  )

  // Window handlers
  ipcMain.handle('open-settings', () => {
    createSettingsWindow()
  })

  ipcMain.handle('close-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      window.close()
    }
  })

  ipcMain.handle('minimize-window', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      window.minimize()
    }
  })

  // Result window handlers
  ipcMain.handle(IpcChannel.Window_OpenResult, async (_, options: ResultWindowOptions) => {
    createResultWindow(options)
  })

  ipcMain.handle(IpcChannel.Window_CloseResult, async () => {
    if (resultWindow) {
      resultWindow.close()
      resultWindow = null
    }
  })
}

app.on('ready', () => {
  console.log('[MAIN] app.ready event fired')
  logger.info('=== App Ready ===')
  
  console.log('[MAIN] Registering IPC handlers...')
  registerIpcHandlers()
  console.log('[MAIN] IPC handlers registered')
  
  console.log('[MAIN] Initializing SelectionService...')
  logger.info('Initializing SelectionService...')
  try {
    const selectionServiceStarted = initSelectionService(configManager)
    console.log(`[MAIN] SelectionService initialized: ${selectionServiceStarted}`)
    logger.info(`SelectionService initialized: ${selectionServiceStarted}`)
  } catch (error) {
    console.error('[MAIN] Error initializing SelectionService:', error)
    logger.error('Error initializing SelectionService:', error as Error)
  }
  
  console.log('[MAIN] Creating settings window...')
  createSettingsWindow()
  logger.info('Settings window created')
})

app.on('window-all-closed', () => {
  // Cleanup SelectionService
  quitSelectionService()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

export { mainWindow, createSettingsWindow }
