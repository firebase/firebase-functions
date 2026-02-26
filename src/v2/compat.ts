// src/v2/compat.ts
import { CloudEvent } from "./core";
import { MessagePublishedData, Message, V1PubSubMessage, messagePublishedEvent } from "./providers/pubsub";
import { StorageObjectData, archivedEvent, finalizedEvent, deletedEvent, metadataUpdatedEvent } from "./providers/storage";
import { ObjectMetadata } from "../v1/providers/storage";
import { EventContext as V1EventContext } from "../v1";

const V1_COMPAT_PATCHED = Symbol.for("firebase.functions.v2.compat");

interface PatchedEvent {
  [V1_COMPAT_PATCHED]?: boolean;
}

// Base V1 Context Interface
export interface V1Context extends Omit<V1EventContext, "resource"> {
  resource: { service: string; name: string };
}



export interface V1Event<T> {
  data: T;
  context: V1Context;
}

// Type for CloudEvent enhanced with V1 Pub/Sub properties
export type PubSubCloudEvent<T> = CloudEvent<MessagePublishedData<T>> & {
  context: V1Context;
  message: V1PubSubMessage<T>;
  getV1Compat: () => V1Event<V1PubSubMessage<T>> & { message: V1PubSubMessage<T> };
};

// Type for CloudEvent enhanced with V1 Storage properties
export type StorageCloudEvent<T> = CloudEvent<T> & {
  getV1Compat: () => V1Event<ObjectMetadata> & { object: ObjectMetadata };
};

// Overloads for patchV1Compat
export function patchV1Compat<T>(event: CloudEvent<MessagePublishedData<T>>): PubSubCloudEvent<T>;
export function patchV1Compat(event: CloudEvent<StorageObjectData>): StorageCloudEvent<StorageObjectData>;
export function patchV1Compat<T>(event: CloudEvent<T>): CloudEvent<T>;

/**
 * Patches a CloudEvent with V1 compatibility properties (context and message) if it's a supported type (e.g., Pub/Sub).
 * This function ensures idempotency by using a Symbol to mark already patched events.
 * @param event The CloudEvent to potentially patch.
 * @returns The patched CloudEvent with V1 compatibility properties, or the original event if not a supported event type or already patched.
 */
export function patchV1Compat(event: CloudEvent<any>): any {
  // Use a symbol to ensure we only patch once.
  if ((event as PatchedEvent)[V1_COMPAT_PATCHED]) {
    return event;
  }
  Object.defineProperty(event, V1_COMPAT_PATCHED, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });

  // Provider-specific logic
  switch (event.type) {
    case messagePublishedEvent: {
      const pubsubEvent = event as CloudEvent<MessagePublishedData<any>>;
      const pubsubData = pubsubEvent.data;

      // Null safety guard
      if (!pubsubData || !pubsubData.message) {
        throw new Error("Malformed Pub/Sub event: missing 'message' property.");
      }

      if (!(pubsubData.message instanceof Message)) {
        // Mutate the event object to ensure it contains a Message instance
        (pubsubData as any).message = new Message(pubsubData.message);
      }
      const v2Message = pubsubData.message;

      Object.defineProperty(pubsubEvent, "context", {
        get: () => {
          const service = "pubsub.googleapis.com";
          const sourcePrefix = `//${service}/`;
          return {
            eventId: v2Message.messageId,
            timestamp: v2Message.publishTime,
            eventType: "google.pubsub.topic.publish",
            resource: {
              service,
              name: event.source?.startsWith(sourcePrefix)
                ? event.source.substring(sourcePrefix.length)
                : event.source || "",
            },
            params: {},
          } as V1Context;
        },
        configurable: true,
        enumerable: true,
      });

      Object.defineProperty(pubsubEvent, "message", {
        get: () => {
          const baseV1Message = {
            data: v2Message.data,
            messageId: v2Message.messageId,
            publishTime: v2Message.publishTime,
            attributes: v2Message.attributes,
            ...(v2Message.orderingKey && { orderingKey: v2Message.orderingKey }),
          };
          return {
            ...baseV1Message,
            get json() {
              return v2Message.json;
            },
            toJSON: () => baseV1Message,
          };
        },
        configurable: true,
        enumerable: true,
      });

      let v1Cache: any;
      (pubsubEvent as any).getV1Compat = function (this: PubSubCloudEvent<any>) {
        if (!v1Cache) {
          const message = this.message;
          v1Cache = {
            data: message,
            message,
            context: this.context
          };
        }
        return v1Cache;
      };

      return pubsubEvent;
    } // This cast is safe due to the overloads, type inference will work for the caller

    case finalizedEvent:
    case archivedEvent:
    case deletedEvent:
    case metadataUpdatedEvent: {
      const storageEvent = event as any;
      const v2Data = storageEvent.data;

      // Accessor for V1 Context
      const getContext = () => {
        const service = "storage.googleapis.com";
        const sourcePrefix = `//${service}/`;
        return {
          eventId: storageEvent.id,
          timestamp: storageEvent.time,
          eventType: v1EventType(event.type),
          resource: {
            service,
            name: event.source?.startsWith(sourcePrefix)
              ? event.source.substring(sourcePrefix.length)
              : event.source || "",
          },
          params: {},
        } as V1Context;
      };

      // Accessor for V1 Data
      const getData = () => v2ToV1Storage(v2Data);

      // Attach getV1Compat
      let v1Cache: any;
      storageEvent.getV1Compat = () => {
        if (!v1Cache) {
          const data = getData();
          v1Cache = {
            context: getContext(),
            data,
            object: data,
          };
        }
        return v1Cache;
      };

      return storageEvent;
    } // case

    default:
      return event;
  }
}

function v1EventType(v2Type: string): string {
  switch (v2Type) {
    case finalizedEvent:
      return "google.storage.object.finalize";
    case archivedEvent:
      return "google.storage.object.archive";
    case deletedEvent:
      return "google.storage.object.delete";
    case metadataUpdatedEvent:
      return "google.storage.object.metadataUpdate";
    default:
      return v2Type;
  }
}

function v2ToV1Storage(v2: StorageObjectData): ObjectMetadata {
  if (!v2) {
    throw new Error("Malformed Storage event: missing 'data' property.");
  }
  const v1: any = { ...v2 };
  // V1 uses 'id' as the full path, V2 'id' might be different but usually compatible.
  // V1 'kind' is 'storage#object'.
  v1.kind = "storage#object";

  // Date conversions: V2 might be string or Date, V1 is string (RFC 3339)
  if (v2.timeCreated instanceof Date) v1.timeCreated = v2.timeCreated.toISOString();
  if (v2.updated instanceof Date) v1.updated = v2.updated.toISOString();
  if (v2.timeDeleted instanceof Date) v1.timeDeleted = v2.timeDeleted.toISOString();
  if (v2.timeStorageClassUpdated instanceof Date) v1.timeStorageClassUpdated = v2.timeStorageClassUpdated.toISOString();

  // 'size' in V2 is number, V1 says string.
  if (typeof v2.size === "number") v1.size = v2.size.toString();

  return v1 as ObjectMetadata;
}
