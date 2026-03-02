// src/v2/compat.ts
import { CloudEvent } from "./core";
import { MessagePublishedData, Message, V1PubSubMessage } from "./providers/pubsub";
import { EventContext as V1EventContext } from "../v1";

const V1_COMPAT_PATCHED = Symbol.for("firebase.functions.v2.compat");

interface PatchedEvent {
  [V1_COMPAT_PATCHED]?: boolean;
}

// Base V1 Context Interface
export interface V1Context extends Omit<V1EventContext, "resource"> {
  resource: { service: string; name: string };
}

// Type for CloudEvent enhanced with V1 Pub/Sub properties
export type PubSubCloudEvent<T> = CloudEvent<MessagePublishedData<T>> & {
  context: V1Context;
  message: V1PubSubMessage<T>;
};

// Overloads for patchV1Compat
export function patchV1Compat<T>(event: CloudEvent<MessagePublishedData<T>>): PubSubCloudEvent<T>;
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
    case "google.cloud.pubsub.topic.v1.messagePublished": {
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
      return pubsubEvent;
    } // This cast is safe due to the overloads, type inference will work for the caller

    default:
      return event;
  }
}
