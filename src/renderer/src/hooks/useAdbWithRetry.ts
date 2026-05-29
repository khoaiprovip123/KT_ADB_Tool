import { useCallback } from 'react';
import { useDeviceStore } from '../store/deviceStore';

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Hook để thực thi ADB commands với automatic retry
 * Xử lý connection drops & temporary failures
 */
export const useAdbWithRetry = () => {
  const { addLog } = useDeviceStore();

  const executeWithRetry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options: RetryOptions = {}
    ): Promise<T> => {
      const {
        maxRetries = 3,
        delayMs = 1000,
        exponentialBackoff = true,
        onRetry,
      } = options;

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const result = await fn();
          
          // Log success if retried
          if (attempt > 0) {
            addLog(`[RETRY SUCCESS] Thành công ở lần thứ ${attempt + 1}`);
          }
          
          return result;
        } catch (error) {
          lastError = error as Error;
          
          // Log error
          addLog(`[RETRY ATTEMPT ${attempt + 1}/${maxRetries}] Error: ${lastError.message}`);

          // Callback for UI updates
          onRetry?.(attempt + 1, lastError);

          // Don't retry if this is the last attempt
          if (attempt === maxRetries - 1) {
            break;
          }

          // Calculate delay with exponential backoff
          const delay = exponentialBackoff
            ? delayMs * Math.pow(2, attempt)
            : delayMs;

          addLog(`[WAIT] Chờ ${delay}ms trước khi retry...`);
          
          // Wait before retrying
          await new Promise(r => setTimeout(r, delay));
        }
      }

      // All retries exhausted
      throw lastError;
    },
    [addLog]
  );

  return { executeWithRetry };
};
