
import { createLogger } from '../logger';

const { logDebug, logError } = createLogger();

/**
 * Observe and log network errors
 */
export class ErrorObserver {
  private static instance: ErrorObserver;
  private errors: Array<{url: string, error: string, timestamp: number}> = [];
  
  private constructor() {
    // Private constructor to prevent direct construction calls with the `new` operator
    logDebug('ErrorObserver initialized');
  }
  
  public static getInstance(): ErrorObserver {
    if (!ErrorObserver.instance) {
      ErrorObserver.instance = new ErrorObserver();
    }
    
    return ErrorObserver.instance;
  }
  
  /**
   * Log a network error and potentially alert monitoring systems
   */
  public logNetworkError(url: string, error: Error | string): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    logError(`Network error for ${url}: ${errorMessage}`);
    
    this.errors.push({
      url,
      error: errorMessage,
      timestamp: Date.now()
    });
    
    // If we see too many errors, we might want to notify someone
    this.checkErrorThreshold();
  }
  
  /**
   * Check if we've hit an error threshold that requires attention
   */
  private checkErrorThreshold(): void {
    const recentErrors = this.errors.filter(
      e => e.timestamp > Date.now() - 60000 // Last minute
    );
    
    if (recentErrors.length >= 5) {
      logDebug(`High error rate detected: ${recentErrors.length} errors in the last minute`);
      // Here you could trigger an alert or notification
    }
  }
  
  /**
   * Get recent error statistics
   */
  public getErrorStats(): {total: number, recent: number} {
    const recentErrors = this.errors.filter(
      e => e.timestamp > Date.now() - 300000 // Last 5 minutes
    );
    
    return {
      total: this.errors.length,
      recent: recentErrors.length
    };
  }
  
  /**
   * Clear error history
   */
  public clearErrors(): void {
    this.errors = [];
    logDebug('Error history cleared');
  }
}
