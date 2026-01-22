export class Logger {
  private context: string = 'App'

  constructor(context?: string) {
    if (context) {
      this.context = context
    }
  }

  info(message: string, data?: any): void {
    console.log(`[INFO][${this.context}] ${message}`, data || '')
  }

  error(message: string, error?: Error | any): void {
    console.error(`[ERROR][${this.context}] ${message}`, error || '')
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN][${this.context}] ${message}`, data || '')
  }

  debug(message: string, data?: any): void {
    console.debug(`[DEBUG][${this.context}] ${message}`, data || '')
  }

  withContext(context: string): Logger {
    return new Logger(context)
  }
}

export const logger = new Logger()