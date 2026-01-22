import { configManager } from './ConfigManager'
import { logger } from './Logger'

export class LMStudioService {
  private static readonly REQUEST_TIMEOUT = 5000

  private static async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), LMStudioService.REQUEST_TIMEOUT)
    
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const settings = configManager.getLMStudioSettings()
      if (!settings.enabled) {
        return false
      }

      const url = `${configManager.getConnectionString()}${settings.apiPath}/models`
      const response = await LMStudioService.fetchWithTimeout(url, {
        method: 'GET',
      })

      return response.ok
    } catch (error) {
      logger.error('LM Studio connection test failed:', error as Error)
      return false
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const settings = configManager.getLMStudioSettings()
      if (!settings.enabled) {
        return []
      }

      const url = `${configManager.getConnectionString()}${settings.apiPath}/models`
      const response = await LMStudioService.fetchWithTimeout(url, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = (await response.json()) as any
      return data.data?.map((model: any) => model.id) || []
    } catch (error) {
      logger.error('Failed to fetch models from LM Studio:', error as Error)
      return []
    }
  }

  async generateCompletion(text: string, systemPrompt?: string): Promise<string> {
    try {
      const settings = configManager.getLMStudioSettings()
      if (!settings.enabled) {
        throw new Error('LM Studio is not enabled')
      }

      // Use model from settings or fallback to 'default'
      const model = settings.model || 'default'

      const url = `${configManager.getConnectionString()}${settings.apiPath}/chat/completions`
      const messages = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: text },
      ]

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = (await response.json()) as any
      return data.choices?.[0]?.message?.content || ''
    } catch (error) {
      logger.error('Failed to generate completion:', error as Error)
      throw error
    }
  }
}

export const lmStudioService = new LMStudioService()
