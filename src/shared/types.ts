export interface ActionItem {
  id: string
  name: string
  icon: string
  enabled: boolean
  isBuiltIn: boolean
  selectedText?: string
  searchEngine?: string
}

export interface TextSelectionData {
  text: string
  programName: string
  posLevel: number
  mousePosStart: { x: number; y: number }
  mousePosEnd: { x: number; y: number }
  startTop: { x: number; y: number }
  startBottom: { x: number; y: number }
  endTop: { x: number; y: number }
  endBottom: { x: number; y: number }
  isFullscreen?: boolean
}

export interface LMStudioSettings {
  enabled: boolean
  host: string
  port: number
  model: string
  apiPath: string
}

export interface SettingsConfig {
  triggerMode: 'selection' | 'ctrlkey' | 'shortcut'
  followToolbar: boolean
  rememberWindowSize: boolean
  filterMode: 'default' | 'whitelist' | 'blacklist'
  filterList: string[]
  compactMode: boolean
  lmStudio: LMStudioSettings
  shortcutKey: string
}

export interface ResultWindowOptions {
  action: 'explain' | 'summarize' | 'translate'
  text: string
  result: string
}
