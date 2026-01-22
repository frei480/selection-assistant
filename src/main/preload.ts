import { contextBridge, ipcRenderer } from 'electron'

// IPC Channel constants - copied to avoid import issues in preload
const IpcChannels = {
  Settings_Get: 'settings:get',
  Settings_Set: 'settings:set',
  Settings_Reset: 'settings:reset',
  LMStudio_TestConnection: 'lmstudio:testConnection',
  LMStudio_GetModels: 'lmstudio:getModels',
  LMStudio_GenerateCompletion: 'lmstudio:generateCompletion',
  Window_OpenResult: 'window:openResult',
  Window_CloseResult: 'window:closeResult',
  Selection_TextSelected: 'selection:textSelected',
  Selection_ToolbarHide: 'selection:toolbarHide',
  Selection_WriteToClipboard: 'selection:writeToClipboard',
  Selection_ToolbarDetermineSize: 'selection:toolbarDetermineSize',
  Selection_ProcessAction: 'selection:processAction',
  Selection_ToolbarVisibilityChange: 'selection:toolbarVisibilityChange',
}

const api = {
  settings: {
    get: (): Promise<any> => ipcRenderer.invoke(IpcChannels.Settings_Get),
    set: (key: string, value: any): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.Settings_Set, key, value),
    reset: (): Promise<void> => ipcRenderer.invoke(IpcChannels.Settings_Reset),
  },
  lmstudio: {
    testConnection: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.LMStudio_TestConnection),
    getModels: (): Promise<string[]> => ipcRenderer.invoke(IpcChannels.LMStudio_GetModels),
    generateCompletion: (prompt: string): Promise<string> =>
      ipcRenderer.invoke(IpcChannels.LMStudio_GenerateCompletion, prompt),
  },
  window: {
    openSettings: (): Promise<void> => ipcRenderer.invoke('open-settings'),
    openResult: (options: any): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.Window_OpenResult, options),
    closeResult: (): Promise<void> => ipcRenderer.invoke(IpcChannels.Window_CloseResult),
    close: (): Promise<void> => ipcRenderer.invoke('close-window'),
    minimize: (): Promise<void> => ipcRenderer.invoke('minimize-window'),
  },
  selection: {
    hideToolbar: (): Promise<void> => ipcRenderer.invoke(IpcChannels.Selection_ToolbarHide),
    writeToClipboard: (text: string): Promise<boolean> =>
      ipcRenderer.invoke(IpcChannels.Selection_WriteToClipboard, text),
    determineToolbarSize: (width: number, height: number): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.Selection_ToolbarDetermineSize, width, height),
    processAction: (action: any, isFullScreen?: boolean): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.Selection_ProcessAction, action, isFullScreen),
    onTextSelected: (callback: (data: any) => void) => {
      ipcRenderer.on(IpcChannels.Selection_TextSelected, (_, data) => callback(data))
    },
    onToolbarVisibilityChange: (callback: (visible: boolean) => void) => {
      ipcRenderer.on(IpcChannels.Selection_ToolbarVisibilityChange, (_, visible) => callback(visible))
    },
  },
}

contextBridge.exposeInMainWorld('ipc', api)

declare global {
  interface Window {
    ipc: typeof api
  }
}
