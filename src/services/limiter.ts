// Simple token bucket rate limiter
// 19 calls per minute (same as Python @limits(calls=19, period=1))
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  
  constructor(maxTokens: number = 19, period: number = 1) {
    this.maxTokens = maxTokens;
    this.refillRate = maxTokens / period;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }
  
  private refillTokens() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const newTokens = Math.floor(elapsed * this.refillRate);
    
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
  
  async wait(): Promise<void> {
    this.refillTokens();
    
    if (this.tokens < 1) {
      // Wait for tokens to refill
      const tokensNeeded = 1;
      const waitTime = (tokensNeeded / this.refillRate) * 1000; // milliseconds
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refillTokens();
    }
    
    this.tokens -= 1;
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter(19, 1);

// Retry function with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3, 
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await rateLimiter.wait();
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 404 or 400 errors
      if (error instanceof Response) {
        if (error.status === 404 || error.status === 400) {
          throw error;
        }
      }
      
      // Wait before retry with exponential backoff
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Wrapper for API calls with rate limiting and retries
export async function callApi<T>(fn: () => Promise<T>): Promise<T> {
  return retry(fn);
}