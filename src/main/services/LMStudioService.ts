import { configManager } from './ConfigManager'
import { logger } from './Logger'
import { networkInterfaces } from 'os'

export class LMStudioService {
  private static readonly REQUEST_TIMEOUT = 30000

  private static async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), LMStudioService.REQUEST_TIMEOUT)
    
    try {
      logger.info(`Making request to: ${url}`)
      logger.info(`Request timeout: ${LMStudioService.REQUEST_TIMEOUT}ms`)
      logger.info(`Request init: ${JSON.stringify(init)}`)
      
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      
      logger.info(`Response received: status=${response.status}, ok=${response.ok}`)
      return response
    } catch (error) {
      // Log network errors specifically
      logger.error(`Network error occurred during fetch:`, error as Error)
      
      if (error instanceof Error) {
        logger.error(`Error details - name: ${error.name}, message: ${error.message}`)
        
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
        } else if (error.message.includes('EACCES')) {
          logger.error(`Permission denied when connecting to ${url}: ${error.message}`)
          throw new Error(`Permission denied: Unable to connect to LM Studio at ${url}. Please check your firewall and network permissions.`)
        } else {
          logger.error(`Network error when connecting to ${url}: ${error.message}`)
          throw new Error(`Network error: ${error.message}. Please check your connection settings and network connectivity.`)
        }
      }
      logger.error(`Unknown error occurred while connecting to LM Studio: ${String(error)}`)
      throw new Error(`Unknown error occurred while connecting to LM Studio: ${String(error)}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[LMStudioService] === STARTING LM STUDIO CONNECTION TEST ===')
      logger.info('=== STARTING LM STUDIO CONNECTION TEST ===')
      const settings = configManager.getLMStudioSettings()
      // LM Studio integration is always enabled now
      console.log('[LMStudioService] LM Studio settings retrieved:', settings)
      logger.info(`LM Studio settings retrieved:`, settings)

      const baseUrl = configManager.getConnectionString()
      const url = `${baseUrl}${settings.apiPath}/models`
      console.log('[LMStudioService] Testing LM Studio connection at:', url)
      logger.info(`Testing LM Studio connection at: ${url}`)
      logger.info(`LM Studio settings: host=${settings.host}, port=${settings.port}, apiPath=${settings.apiPath}`)
      
      // Log the individual components for debugging
      logger.info(`LM Studio base URL components: host=${settings.host}, port=${settings.port}`)
      logger.info(`LM Studio API path: ${settings.apiPath}`)
      logger.info(`Constructed base URL: ${baseUrl}`)
      logger.info(`Full test URL: ${url}`)
      
      // Check if host is localhost or 127.0.0.1 and provide specific guidance
      if (settings.host === 'localhost' || settings.host === '127.0.0.1') {
        const nets = networkInterfaces()
        let hasLocalhost = false
        for (const name of Object.keys(nets)) {
          for (const net of nets[name] || []) {
            if (!net.internal && net.family === 'IPv4') {
              hasLocalhost = true
              break
            }
          }
          if (hasLocalhost) break
        }
        if (!hasLocalhost) {
          logger.warn('No external network interfaces found. This might affect localhost connections.')
        }
      }
      
      console.log('[LMStudioService] Making request to LM Studio')
      const response = await LMStudioService.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('[LMStudioService] LM Studio connection test response status:', response.status)
      logger.info(`LM Studio connection test response status: ${response.status}`)
      logger.info(`LM Studio connection test response ok: ${response.ok}`)
      if (!response.ok) {
        const errorText = await response.text()
        console.log('[LMStudioService] LM Studio connection test failed with status:', response.status, 'error:', errorText)
        logger.error(`LM Studio connection test failed with status ${response.status}: ${errorText}`)
        logger.info(`Returning false due to non-ok response`)
        // Instead of throwing, we return false to indicate connection failure
        return false
      }
      console.log('[LMStudioService] LM Studio connection test successful')
      logger.info(`Returning true as response is ok`)
      return true
    } catch (error) {
      console.log('[LMStudioService] LM Studio connection test failed with error:', error)
      logger.error('LM Studio connection test failed:', error as Error)
      // Log specific error details
      if (error instanceof Error) {
        logger.error(`Error name: ${error.name}, message: ${error.message}`)
        if ('cause' in error && error.cause) {
          logger.error(`Error cause: ${String(error.cause)}`)
        }
      }
      logger.info('Returning false due to caught error')
      // Return false to indicate connection failure
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
          stream: false, // Disable streaming for now to keep the existing API
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

  async generateCompletionStream(
    text: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void,
    onComplete?: (finalText: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      const settings = configManager.getLMStudioSettings()
      // LM Studio integration is always enabled now

      // Use model from settings or fallback to 'default'
      const model = settings.model || 'default'

      const url = `${configManager.getConnectionString()}${settings.apiPath}/chat/completions`
      logger.info(`Generating streaming completion with LM Studio at: ${url}`)
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
          stream: true, // Enable streaming
        }),
      })

      logger.info(`LM Studio streaming completion response status: ${response.status}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim() !== '')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                // Stream is complete
                onComplete?.(fullText)
                return
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content || ''
                if (content) {
                  fullText += content
                  onChunk?.(content)
                }
              } catch (parseError) {
                logger.warn('Failed to parse streaming data:', data)
              }
            }
          }
        }

        // If we get here, the stream ended without [DONE]
        onComplete?.(fullText)
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      logger.error('Failed to generate streaming completion:', error as Error)
      // Log specific error details
      if (error instanceof Error) {
        logger.error(`Error name: ${error.name}, message: ${error.message}`)
        if ('cause' in error && error.cause) {
          logger.error(`Error cause: ${String(error.cause)}`)
        }
      }
      onError?.(error as Error)
    }
  }
}

export const lmStudioService = new LMStudioService()