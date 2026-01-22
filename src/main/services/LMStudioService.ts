import { configManager } from './ConfigManager'
import { logger } from './Logger'
import { networkInterfaces } from 'os'

export class LMStudioService {
  private static readonly REQUEST_TIMEOUT = 5000

  private static async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), LMStudioService.REQUEST_TIMEOUT)
    
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      return response
    } catch (error) {
      // Log network errors specifically
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error(`Request to ${url} timed out after ${LMStudioService.REQUEST_TIMEOUT}ms`)
          throw new Error(`Connection timeout: Request to LM Studio timed out after ${LMStudioService.REQUEST_TIMEOUT}ms. Please check if LM Studio is running and accessible.`)
        } else if (error.message.includes('ECONNREFUSED')) {
          logger.error(`Connection refused when connecting to ${url}: ${error.message}`)
          throw new Error(`Connection refused: Unable to connect to LM Studio at ${url}. Please check that LM Studio is running and the API server is enabled.`)
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('EAI_AGAIN')) {
          logger.error(`DNS lookup failed when connecting to ${url}: ${error.message}`)
          throw new Error(`DNS lookup failed: Unable to resolve hostname ${new URL(url).hostname}. Please check your network connection and host settings.`)
        } else if (error.message.includes('EHOSTUNREACH') || error.message.includes('ENETUNREACH')) {
          logger.error(`Network unreachable when connecting to ${url}: ${error.message}`)
          throw new Error(`Network unreachable: Unable to reach ${url}. Please check your network connection and firewall settings.`)
        } else {
          logger.error(`Network error when connecting to ${url}: ${error.message}`)
          throw new Error(`Network error: ${error.message}. Please check your connection settings and network connectivity.`)
        }
      }
      throw new Error(`Unknown error occurred while connecting to LM Studio: ${String(error)}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const settings = configManager.getLMStudioSettings()
      // LM Studio integration is always enabled now

      const baseUrl = configManager.getConnectionString()
      const url = `${baseUrl}${settings.apiPath}/models`
      logger.info(`Testing LM Studio connection at: ${url}`)
      logger.info(`LM Studio settings: host=${settings.host}, port=${settings.port}, apiPath=${settings.apiPath}`)
      const response = await LMStudioService.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      logger.info(`LM Studio connection test response status: ${response.status}`)
      return response.ok
    } catch (error) {
      logger.error('LM Studio connection test failed:', error as Error)
      // Log specific error details
      if (error instanceof Error) {
        logger.error(`Error name: ${error.name}, message: ${error.message}`)
        if ('cause' in error && error.cause) {
          logger.error(`Error cause: ${String(error.cause)}`)
        }
      }
      return false
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const settings = configManager.getLMStudioSettings()
      // LM Studio integration is always enabled now

      const baseUrl = configManager.getConnectionString()
      const url = `${baseUrl}${settings.apiPath}/models`
      logger.info(`Fetching models from LM Studio at: ${url}`)
      logger.info(`LM Studio settings: host=${settings.host}, port=${settings.port}, apiPath=${settings.apiPath}`)
      const response = await LMStudioService.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      logger.info(`LM Studio models response status: ${response.status}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = (await response.json()) as any
      logger.info(`LM Studio models response data:`, data)
      // Handle different response formats
      if (Array.isArray(data.data)) {
        return data.data.map((model: any) => model.id || model.name || model).filter(Boolean)
      } else if (Array.isArray(data)) {
        return data.map((model: any) => model.id || model.name || model).filter(Boolean)
      } else {
        logger.warn('Unexpected response format from LM Studio models endpoint:', data)
        return []
      }
    } catch (error) {
      logger.error('Failed to fetch models from LM Studio:', error as Error)
      // Log specific error details
      if (error instanceof Error) {
        logger.error(`Error name: ${error.name}, message: ${error.message}`)
        if ('cause' in error && error.cause) {
          logger.error(`Error cause: ${String(error.cause)}`)
        }
      }
      return []
    }
  }

  async generateCompletion(text: string, systemPrompt?: string): Promise<string> {
    try {
      const settings = configManager.getLMStudioSettings()
      // LM Studio integration is always enabled now

      // Use model from settings or fallback to 'default'
      const model = settings.model || 'default'

      const url = `${configManager.getConnectionString()}${settings.apiPath}/chat/completions`
      logger.info(`Generating completion with LM Studio at: ${url}`)
      const messages = [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: text },
      ]

      const response = await LMStudioService.fetchWithTimeout(url, {
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
      })

      logger.info(`LM Studio completion response status: ${response.status}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = (await response.json()) as any
      logger.info(`LM Studio completion response data:`, data)
      return data.choices?.[0]?.message?.content || ''
    } catch (error) {
      logger.error('Failed to generate completion:', error as Error)
      // Log specific error details
      if (error instanceof Error) {
        logger.error(`Error name: ${error.name}, message: ${error.message}`)
        if ('cause' in error && error.cause) {
          logger.error(`Error cause: ${String(error.cause)}`)
        }
      }
      throw error
    }
  }
}

export const lmStudioService = new LMStudioService()
