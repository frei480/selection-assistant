// Declare window API types
declare global {
  interface Window {
    ipc: {
      settings: {
        get: () => Promise<any>
        set: (key: string, value: any) => Promise<void>
        reset: () => Promise<void>
      }
      lmstudio: {
        testConnection: () => Promise<boolean>
        getModels: () => Promise<string[]>
        generateCompletion: (prompt: string) => Promise<string>
      }
      window: {
        openSettings: () => Promise<void>
        close: () => Promise<void>
        minimize: () => Promise<void>
        openResult: (options: any) => Promise<void>
        closeResult: () => Promise<void>
      }
      selection: {
        hideToolbar: () => Promise<void>
        writeToClipboard: (text: string) => Promise<boolean>
        determineToolbarSize: (width: number, height: number) => Promise<void>
        processAction: (action: any, isFullScreen?: boolean) => Promise<void>
        onTextSelected: (callback: (data: any) => void) => void
        onToolbarVisibilityChange: (callback: (visible: boolean) => void) => void
      }
    }
  }
}

export {}
