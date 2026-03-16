import { EventContext as V1EventContext } from "../v1/cloud-functions";
import { CloudEvent } from "./core";

/**
 * Utility type to optionally map V2 CloudEvents to V1 events.
 * @internal
 */
export type V1Compat<DataField extends string, DataType, ContextType = V1EventContext> = {
  context: ContextType;
} & {
  [K in DataField]: DataType;
};

/**
 * Utility to lazily inject V1 getters onto V2 events to avoid contravariance
 * issues while maintaining referential stability.
 * @internal
 */
export function addV1Compat<
  T extends CloudEvent<unknown>,
  DataField extends string,
  DataType,
  ContextType = V1EventContext
>(
  event: T,
  dataField: DataField,
  dataGetter: () => DataType,
  contextGetter: () => ContextType
): void {
  // Caching mechanism to avoid React render issues
  let cachedContext: ContextType | undefined;
  let cachedData: DataType | undefined;

  Object.defineProperty(event, "context", {
    get: function () {
      if (cachedContext) {
        return cachedContext;
      }
      cachedContext = contextGetter();
      return cachedContext;
    },
    configurable: true,
    enumerable: true,
  });

  Object.defineProperty(event, dataField, {
    get: function () {
      if (cachedData) {
        return cachedData;
      }
      cachedData = dataGetter();
      return cachedData;
    },
    configurable: true,
    enumerable: true,
  });
}
