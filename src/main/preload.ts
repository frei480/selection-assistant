import { contextBridge, ipcRenderer } from 'electron'

// IPC Channel constants - copied to avoid import issues in preload
const IpcChannels = {
  Settings_Get: 'settings:get',
  Settings_Set: 'settings:set',
  Settings_Reset: 'settings:reset',
  LMStudio_TestConnection: 'lmstudio:testConnection',
  LMStudio_GetModels: 'lmstudio:getModels',
  LMStudio_GenerateCompletion: 'lmstudio:generateCompletion',
  LMStudio_GenerateCompletionStream: 'lmstudio:generateCompletionStream',
  Window_OpenResult: 'window:openResult',
  Window_CloseResult: 'window:closeResult',
  Window_UpdateResult: 'window:updateResult',
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
    testConnection: (): Promise<boolean> => {
      console.log('[preload] testConnection called')
      console.log('[preload] Invoking IPC channel:', IpcChannels.LMStudio_TestConnection)
      const result = ipcRenderer.invoke(IpcChannels.LMStudio_TestConnection)
      console.log('[preload] IPC invoke returned promise:', result)
      return result
    },
    getModels: (): Promise<string[]> => ipcRenderer.invoke(IpcChannels.LMStudio_GetModels),
    generateCompletion: (prompt: string): Promise<string> =>
      ipcRenderer.invoke(IpcChannels.LMStudio_GenerateCompletion, prompt),
    generateCompletionStream: (prompt: string, callback: (chunk: string) => void): Promise<void> => {
      // Set up listener for streaming chunks
      const handleChunk = (_: any, chunk: string) => {
        callback(chunk)
      }
      
      ipcRenderer.on(`${IpcChannels.LMStudio_GenerateCompletionStream}_chunk`, handleChunk)
      
      // Start the streaming completion
      return new Promise((resolve, reject) => {
        ipcRenderer.invoke(IpcChannels.LMStudio_GenerateCompletionStream, prompt)
          .then(() => {
            ipcRenderer.removeListener(`${IpcChannels.LMStudio_GenerateCompletionStream}_chunk`, handleChunk)
            resolve()
          })
          .catch((error) => {
            ipcRenderer.removeListener(`${IpcChannels.LMStudio_GenerateCompletionStream}_chunk`, handleChunk)
            reject(error)
          })
      })
    },
  },
  window: {
    openResult: (options: any): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.Window_OpenResult, options),
    closeResult: (): Promise<void> => ipcRenderer.invoke(IpcChannels.Window_CloseResult),
    updateResult: (result: string): Promise<void> =>
      ipcRenderer.invoke(IpcChannels.Window_UpdateResult, result),
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
    onUpdateResult: (callback: (result: string) => void) => {
      ipcRenderer.on(IpcChannels.Window_UpdateResult, (_, result) => callback(result))
    },
  },
}

contextBridge.exposeInMainWorld('ipc', api)

declare global {
  interface Window {
    ipc: typeof api
  }
}