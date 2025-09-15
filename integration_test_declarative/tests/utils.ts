export const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RetryOptions = { maxRetries?: number; checkForUndefined?: boolean };

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {RetryOptions | undefined} [options={ maxRetries: 10, checkForUndefined: true }]
 *
 * @returns {Promise<T>}
 */
export async function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  let count = 0;
  let lastError: Error | undefined;
  const { maxRetries = 20, checkForUndefined = true } = options ?? {};
  let result: Awaited<T> | null = null;

  while (count < maxRetries) {
    try {
      result = await fn();
      if (!checkForUndefined || result) {
        return result;
      }
    } catch (e) {
      lastError = e as Error;
    }
    await timeout(5000);
    count++;
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Max retries exceeded: result = ${result}`);
}