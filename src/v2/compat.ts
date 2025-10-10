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

import { EventContext, Resource } from "../v1/cloud-functions";

export interface LegacyContextOptions<Params> {
  /**
   * The event type to expose via the legacy context.
   */
  eventType: string;
  /**
   * The backing service name (e.g. firestore.googleapis.com).
   */
  service: string;
  /**
   * Optional resource information. If omitted the function will attempt to
   * derive a resource from the CloudEvent source.
   */
  resource?: string | Resource;
  /**
   * Event params to expose.
   */
  params?: Params;
  /**
   * Optional override for the legacy timestamp. Defaults to the CloudEvent time.
   */
  timestamp?: string;
  /**
   * Optional override for the legacy event ID. Defaults to the CloudEvent id.
   */
  eventId?: string;
  /**
   * Optional auth information to surface.
   */
  auth?: EventContext<Params>["auth"];
  /**
   * Optional auth type information to surface.
   */
  authType?: EventContext<Params>["authType"];
}

/**
 * Defines a lazily-evaluated property on an object with memoized computation.
 *
 * @internal
 */
export function defineLazyGetter<T extends object, K extends PropertyKey, V>(
  target: T,
  property: K,
  compute: () => V
): void {
  if (Object.prototype.hasOwnProperty.call(target, property)) {
    return;
  }

  let cached: V;
  let initialized = false;

  Object.defineProperty(target, property, {
    configurable: true,
    enumerable: true,
    get(): V {
      if (!initialized) {
        cached = compute();
        initialized = true;
      }
      return cached;
    },
  });
}

/**
 * Creates a v1-compatible  EventContext from a v2 CloudEvent.
 *
 * @param event - The CloudEvent carrying the id/time/source metadata.
 * @param options - Legacy context configuration.
 * @internal
 */
export function makeLegacyEventContext<Params>(
  event: { id?: string; time?: string; source?: string },
  options: LegacyContextOptions<Params>
): EventContext<Params> {
  const resource = normalizeResource(options.service, options.resource ?? event.source);
  return {
    eventId: options.eventId ?? event.id ?? "",
    timestamp: options.timestamp ?? event.time ?? new Date().toISOString(),
    eventType: options.eventType,
    resource,
    params: options.params ?? ({} as Params),
    auth: options.auth,
    authType: options.authType,
  };
}

/**
 * A bundle describing how to decorate an event with legacy helpers.
 */
export interface LegacyDecoration<Params, Extras extends Record<string, () => unknown>> {
  context: LegacyContextOptions<Params>;
  getters?: Extras;
}

/**
 * Applies legacy context plus any number of additional lazy getters to the given event object.
 *
 * @internal
 */
export function decorateLegacyEvent<
  EventType extends { id?: string; time?: string; source?: string },
  Params,
  Extras extends Record<string, () => unknown>
>(event: EventType, decoration: LegacyDecoration<Params, Extras>): void {
  defineLazyGetter(event as EventType & { context?: EventContext<Params> }, "context", () =>
    makeLegacyEventContext(event, decoration.context)
  );

  if (!decoration.getters) {
    return;
  }

  for (const [key, factory] of Object.entries(decoration.getters)) {
    defineLazyGetter(event, key as keyof EventType, factory as () => unknown);
  }
}

function normalizeResource(service: string, resource?: string | Resource): Resource {
  if (!resource) {
    return {
      service,
      name: "",
    };
  }

  if (typeof resource !== "string") {
    return {
      service: resource.service ?? service,
      name: resource.name,
      type: resource.type,
      labels: resource.labels,
    };
  }

  let computedService = service;
  let name = resource.trim();

  if (name.startsWith("//")) {
    const withoutScheme = name.slice(2);
    const firstSlash = withoutScheme.indexOf("/");
    if (firstSlash === -1) {
      computedService = withoutScheme || service;
      name = "";
    } else {
      computedService = withoutScheme.slice(0, firstSlash) || service;
      name = withoutScheme.slice(firstSlash + 1);
    }
  }

  if (name.startsWith(computedService + "/")) {
    name = name.slice(computedService.length + 1);
  }

  name = name.replace(/^\/+/, "");

  return {
    service: computedService,
    name,
  };
}
