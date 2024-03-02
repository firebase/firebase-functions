
import * as logger from "../logger";

let initCallback: (() => any) | null = null;
let didInit = false;

/**
 * Registers a callback that should be run when in a production environment
 * before executing any functions code.
 * Calling this function more than once leads to undefined behavior.
 * @param callback initialization callback to be run before any function executes.
 */
export function onInit(callback: () => unknown) {
  if (initCallback) {
    logger.warn(
      "Setting onInit callback more than once. Only the most recent callback will be called"
    );
  }
  initCallback = callback;
  didInit = false;
}

type Resolved<T> = T extends Promise<infer V> ? V : T;

/** @internal */
export function withInit<T extends (...args: unknown[]) => unknown>(func: T) {
  return async (...args: Parameters<T>): Promise<Resolved<ReturnType<T>>> => {
    if (!didInit) {
      if (initCallback) {
        await initCallback();
      }
      didInit = true;
    }

    // Note: This cast is actually inaccurate because it may be a promise, but
    // it doesn't actually matter because the async function will promisify
    // non-promises and forward promises.
    return func(...args) as Resolved<ReturnType<T>>;
  };
}
