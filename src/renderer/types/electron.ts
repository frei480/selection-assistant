// Declare window API types
declare global {
  interface Window {
    electronAPI: {
      settings: {
        get: () => Promise<any>
        set: (key: string, value: any) => Promise<void>
        reset: () => Promise<void>
      }
      lmstudio: {
        testConnection: () => Promise<boolean>
        getModels: () => Promise<string[]>
      }
      window: {
        openSettings: () => Promise<void>
        close: () => Promise<void>
        minimize: () => Promise<void>
      }
    }
  }
}

export {}
