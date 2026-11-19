import * as logger from "../logger";

let initCallback: (() => unknown) | null = null;
let didInit = false;
let initPromise: Promise<void> | null = null;

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
  initPromise = null;
}

function runInit(): Promise<void> {
  if (initPromise === null) {
    const pending = (async () => {
      if (initCallback) {
        await initCallback();
      }
      didInit = true;
    })();
    initPromise = pending;
    pending.catch(() => {
      // Only clear our own promise; onInit may have replaced it meanwhile.
      if (initPromise === pending) {
        initPromise = null;
      }
    });
  }
  return initPromise;
}

type Resolved<T> = T extends Promise<infer V> ? V : T;

/** @internal */
export function withInit<T extends (...args: unknown[]) => unknown>(func: T) {
  return async (...args: Parameters<T>): Promise<Resolved<ReturnType<T>>> => {
    if (!didInit) {
      await runInit();
    }

    // Note: This cast is actually inaccurate because it may be a promise, but
    // it doesn't actually matter because the async function will promisify
    // non-promises and forward promises.
    return func(...args) as Resolved<ReturnType<T>>;
  };
}
