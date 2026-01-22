export class Logger {
  private context: string = 'App'

  constructor(context?: string) {
    if (context) {
      this.context = context
    }
  }

  info(message: string, data?: any): void {
    console.log(`[${this.context}] ${message}`, data || '')
  }

  error(message: string, error?: Error): void {
    console.error(`[${this.context}] ${message}`, error || '')
  }

  warn(message: string, data?: any): void {
    console.warn(`[${this.context}] ${message}`, data || '')
  }

  debug(message: string, data?: any): void {
    if (process.env.DEBUG) {
      console.debug(`[${this.context}] ${message}`, data || '')
    }
  }

  withContext(context: string): Logger {
    return new Logger(context)
  }
}

export const logger = new Logger()
