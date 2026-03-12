// src/v2/compat.ts
import { CloudEvent } from "./core";
import { EventContext as V1EventContext } from "../v1";

export type V1Compat<DataName extends string, DataType, ContextType = V1EventContext> = {
  [K in DataName]: DataType;
} & {
  context: ContextType;
}

const V1_COMPAT_PATCHED = Symbol.for("firebase.functions.v2.compat");

interface PatchedEvent {
  [V1_COMPAT_PATCHED]?: boolean;
}

/**
 * Patches a CloudEvent with V1 compatibility properties via getters.
 * This function ensures idempotency by using a Symbol to mark already patched events.
 * @param event The CloudEvent to patch.
 * @param getters A map of getters to attach to the event object.
 * @returns The patched CloudEvent with V1 compatibility properties.
 */
export function addV1Compat<T extends CloudEvent<unknown>, U extends Record<string, () => any>>(event: T, getters: U): T & U {
  // Use a symbol to ensure we only patch once.
  if ((event as PatchedEvent)[V1_COMPAT_PATCHED]) {
    return event as T & U;
  }
  Object.defineProperty(event, V1_COMPAT_PATCHED, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  for (const [key, getter] of Object.entries(getters)) {
    Object.defineProperty(event, key, {
      get: getter,
      // allow redefining or deleting, mainly in case it gets serialized/deserialized
      configurable: true,
      enumerable: true,
    });
  }

  return event as T & U;
}
