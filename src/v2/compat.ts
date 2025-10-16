// The MIT License (MIT)
//
// Copyright (c) 2025 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/**
 * Compatibility utilities for v1-style event context from v2 CloudEvents.
 * @packageDocumentation
 */

import { CloudEvent } from "./core";
import { EventContext } from "../v1/cloud-functions";

/**
 * Type for a lazy getter function that computes a property value from the event.
 * @internal
 */
type PropertyGetter<TEvent, TValue> = (event: TEvent) => TValue;

/**
 * Augments a v2 CloudEvent with v1-compatible properties using lazy getters.
 * This is a reusable utility that can be used across all providers to add
 * v1-compatible properties to v2 events.
 *
 * @param event - The v2 CloudEvent to augment with v1 compatibility properties.
 * @param properties - An object mapping property names to getter functions.
 * @returns The event with v1 compatibility properties added.
 *
 * @example
 * ```typescript
 * const eventWithCompat = withV1CompatProperties(rawEvent, {
 *   context: (event) => cloudEventToEventContext(event, "google.pubsub.topic.publish"),
 *   message: (event) => new V1Message(event.data.message),
 * });
 * ```
 *
 * @internal
 */
export function withV1CompatProperties<
  TEvent extends CloudEvent<unknown>,
  TProps extends Record<string, unknown>
>(
  event: TEvent,
  properties: { [K in keyof TProps]: PropertyGetter<TEvent, TProps[K]> }
): TEvent & TProps {
  const eventWithCompat = event as TEvent & TProps;

  // Add each property as a lazy getter
  for (const [propName, getter] of Object.entries(properties)) {
    Object.defineProperty(eventWithCompat, propName, {
      get: function () {
        return getter(this as TEvent);
      },
      enumerable: true,
    });
  }

  return eventWithCompat;
}

/**
 * Converts a v2 CloudEvent to a v1-compatible EventContext.
 *
 * @param event - The v2 CloudEvent to convert.
 * @param eventType - The v1 event type string (e.g., "google.pubsub.topic.publish").
 * @returns A v1-compatible EventContext.
 * @internal
 */
export function cloudEventToEventContext(
  event: CloudEvent<unknown>,
  eventType: string
): EventContext {
  // Extract params from the subject if available
  // Subject format varies by provider, but for pubsub it's typically like:
  // "projects/{project}/topics/{topic}"
  const params = extractParamsFromSubject(event.subject || event.source);

  // Build the resource object
  const resource = {
    service: getServiceFromEventType(eventType),
    name: event.subject || event.source,
    type: event.type,
  };

  return {
    eventId: event.id,
    timestamp: event.time,
    eventType,
    resource,
    params,
  };
}

/**
 * Extracts parameter values from a CloudEvent subject or source string.
 * For example, "projects/my-project/topics/my-topic" would extract
 * { project: "my-project", topic: "my-topic" }.
 *
 * @param subject - The subject or source string to parse.
 * @returns An object containing extracted parameters.
 * @internal
 */
function extractParamsFromSubject(subject: string): Record<string, string> {
  const params: Record<string, string> = {};

  // Parse resource paths like "projects/{project}/topics/{topic}"
  const parts = subject.split("/");
  for (let i = 0; i < parts.length - 1; i += 2) {
    const key = parts[i];
    const value = parts[i + 1];
    if (key && value) {
      // Store the singular form (e.g., "topics" -> "topic")
      const paramKey = key.endsWith("s") ? key.slice(0, -1) : key;
      params[paramKey] = value;
    }
  }

  return params;
}

/**
 * Maps a v1 event type to its corresponding service name.
 *
 * @param eventType - The v1 event type string.
 * @returns The service name.
 * @internal
 */
function getServiceFromEventType(eventType: string): string {
  // Map event types to their services
  if (eventType.includes("pubsub")) {
    return "pubsub.googleapis.com";
  }
  if (eventType.includes("firestore")) {
    return "firestore.googleapis.com";
  }
  if (eventType.includes("database")) {
    return "firebaseatabase.googleapis.com";
  }
  if (eventType.includes("storage")) {
    return "storage.googleapis.com";
  }
  if (eventType.includes("auth")) {
    return "firebase.googleapis.com";
  }

  // Default fallback
  return eventType.split(".")[1] + ".googleapis.com";
}
