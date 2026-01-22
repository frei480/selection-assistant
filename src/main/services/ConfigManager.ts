import Store from 'electron-store'
import type { SettingsConfig, LMStudioSettings } from '@shared/types'

const defaultSettings: SettingsConfig = {
  triggerMode: 'selection',
  followToolbar: true,
  rememberWindowSize: false,
  filterMode: 'default',
  filterList: [],
  compactMode: false,
  lmStudio: {
    host: 'localhost',
    port: 1234,
    model: 'default',
    apiPath: '/v1',
  },
  shortcutKey: 'Ctrl+Shift+L',
}

export class ConfigManager {
  private store: Store<SettingsConfig>
  private subscribers: Map<keyof SettingsConfig, Set<(value: any) => void>> = new Map()

  constructor() {
    this.store = new Store<SettingsConfig>({
      name: 'selection-assistant-config',
      defaults: defaultSettings,
      schema: {
        triggerMode: {
          type: 'string',
          enum: ['selection', 'ctrlkey', 'shortcut'],
          default: 'selection',
        },
        followToolbar: {
          type: 'boolean',
          default: true,
        },
        rememberWindowSize: {
          type: 'boolean',
          default: false,
        },
        filterMode: {
          type: 'string',
          enum: ['default', 'whitelist', 'blacklist'],
          default: 'default',
        },
        filterList: {
          type: 'array',
          default: [],
        },
        compactMode: {
          type: 'boolean',
          default: false,
        },
        lmStudio: {
          type: 'object',
          default: defaultSettings.lmStudio,
          properties: {
            host: { type: 'string' },
            port: { type: 'number' },
            model: { type: 'string' },
            apiPath: { type: 'string' },
          },
        },
        shortcutKey: {
          type: 'string',
          default: 'Ctrl+Shift+L',
        },
      },
    })

    // Subscribe to changes - watch all keys
    const allKeys = Object.keys(this.store.store) as Array<keyof SettingsConfig>
    allKeys.forEach((key) => {
      this.store.onDidChange(key, (value: any) => {
        const callbacks = this.subscribers.get(key)
        if (callbacks) {
          callbacks.forEach((cb) => cb(value))
        }
      })
    })
  }

  public getAll(): SettingsConfig {
    return this.store.store
  }

  public get<K extends keyof SettingsConfig>(key: K): SettingsConfig[K] {
    return this.store.get(key)
  }

  public set<K extends keyof SettingsConfig>(key: K, value: SettingsConfig[K]): void {
    this.store.set(key, value)
  }

  public subscribe<K extends keyof SettingsConfig>(key: K, callback: (value: SettingsConfig[K]) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    this.subscribers.get(key)!.add(callback)

    return () => {
      this.subscribers.get(key)?.delete(callback)
    }
  }

  public reset(): void {
    this.store.clear()
  }

  public getLMStudioSettings(): LMStudioSettings {
    return this.store.get('lmStudio')
  }

  public setLMStudioSettings(settings: Partial<LMStudioSettings>): void {
    const current = this.store.get('lmStudio')
    this.store.set('lmStudio', { ...current, ...settings })
  }

  public getConnectionString(): string {
    const settings = this.getLMStudioSettings()
    return `http://${settings.host}:${settings.port}`
  }
}

export const configManager = new ConfigManager()
