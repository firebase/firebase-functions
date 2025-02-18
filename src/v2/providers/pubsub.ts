// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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
 * Cloud functions to handle events from Google Cloud Pub/Sub.
 * @packageDocumentation
 */

import { copyIfPresent } from "../../common/encoding";
import { ResetValue } from "../../common/options";
import { initV2Endpoint, ManifestEndpoint } from "../../runtime/manifest";
import { CloudEvent, CloudFunction } from "../core";
import { wrapTraceContext } from "../trace";
import { Expression } from "../../params";
import * as options from "../options";
import { SecretParam } from "../../params/types";
import { withInit } from "../../common/onInit";

/**
 * Google Cloud Pub/Sub is a globally distributed message bus that automatically scales as you need it.
 * You can create a function ({@link onMessagePublished}) that handles pub/sub events by using functions.pubsub.
 *
 * This function triggers whenever a new pub/sub message is sent to a specific topic.
 * You must specify the Pub/Sub topic name that you want to trigger your function, and set the event within the
 * onPublish() event handler.
 *
 * PubSub Topic:
 * <ul>
 *   <li>A resource that you can publish messages to and then consume those messages via subscriptions.
 *   <li>An isolated data stream for pub/sub messages.
 *   <li>Messages are published to a topic.
 *   <li>Messages are listened to via a subscription.
 *   <li>Each subscription listens to the messages published to exactly one topic.
 *
 * Subscriptions - Resource that listens to the messages published by exactly one topic.
 *
 * [More info here](https://firebase.google.com/docs/functions/pubsub-events)
 */

/**
 * Interface representing a Google Cloud Pub/Sub message.
 *
 * @param data - Payload of a Pub/Sub message.
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export class Message<T> {
  /**
   * Autogenerated ID that uniquely identifies this message.
   */
  readonly messageId: string;

  /**
   * Time the message was published
   */
  readonly publishTime: string;

  /**
   * The data payload of this message object as a base64-encoded string.
   */
  readonly data: string;

  /**
   * User-defined attributes published with the message, if any.
   */
  readonly attributes: { [key: string]: string };

  /**
   * User-defined key used to ensure ordering amongst messages with the same key.
   */
  readonly orderingKey: string;

  /** @hidden */
  private _json: T;

  /**
   * @hidden
   * @alpha
   */
  constructor(data: any) {
    this.messageId = data.messageId;
    this.data = data.data;
    this.attributes = data.attributes || {};
    this.orderingKey = data.orderingKey || "";
    this.publishTime = data.publishTime || new Date().toISOString();
    this._json = data.json;
  }

  /**
   * The JSON data payload of this message object, if any.
   */
  get json(): T {
    if (typeof this._json === "undefined") {
      try {
        this._json = JSON.parse(Buffer.from(this.data, "base64").toString("utf8"));
      } catch (err) {
        throw new Error(`Unable to parse Pub/Sub message data as JSON: ${err.message}`);
      }
    }

    return this._json;
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @returns A JSON-serializable representation of this object.
   */
  toJSON(): any {
    const json: Record<string, any> = {
      messageId: this.messageId,
      data: this.data,
      publishTime: this.publishTime,
    };
    if (Object.keys(this.attributes).length) {
      json.attributes = this.attributes;
    }
    if (this.orderingKey) {
      json.orderingKey = this.orderingKey;
    }
    return json;
  }
}

/**
 * The interface published in a Pub/Sub publish subscription.
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export interface MessagePublishedData<T = any> {
  /**  Google Cloud Pub/Sub message. */
  readonly message: Message<T>;
  /** A subscription resource. */
  readonly subscription: string;
}

/** PubSubOptions extend EventHandlerOptions but must include a topic. */
export interface PubSubOptions extends options.EventHandlerOptions {
  /** The Pub/Sub topic to watch for message events */
  topic: string;

  /**
   * If true, do not deploy or emulate this function.
   */
  omit?: boolean | Expression<boolean>;

  /**
   * Region where functions should be deployed.
   */
  region?: options.SupportedRegion | string | Expression<string> | ResetValue;

  /**
   * Amount of memory to allocate to a function.
   */
  memory?: options.MemoryOption | Expression<number> | ResetValue;

  /**
   * Timeout for the function in seconds, possible values are 0 to 540.
   * HTTPS functions can specify a higher timeout.
   *
   * @remarks
   * The minimum timeout for a gen 2 function is 1s. The maximum timeout for a
   * function depends on the type of function: Event handling functions have a
   * maximum timeout of 540s (9 minutes). HTTPS and callable functions have a
   * maximum timeout of 3,600s (1 hour). Task queue functions have a maximum
   * timeout of 1,800s (30 minutes)
   */
  timeoutSeconds?: number | Expression<number> | ResetValue;

  /**
   * Min number of actual instances to be running at a given time.
   *
   * @remarks
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   */
  minInstances?: number | Expression<number> | ResetValue;

  /**
   * Max number of instances to be running in parallel.
   */
  maxInstances?: number | Expression<number> | ResetValue;

  /**
   * Number of requests a function can serve at once.
   *
   * @remarks
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: number | Expression<number> | ResetValue;

  /**
   * Fractional number of CPUs to allocate to a function.
   *
   * @remarks
   * Defaults to 1 for functions with <= 2GB RAM and increases for larger memory sizes.
   * This is different from the defaults when using the gcloud utility and is different from
   * the fixed amount assigned in Google Cloud Functions generation 1.
   * To revert to the CPU amounts used in gcloud or in Cloud Functions generation 1, set this
   * to the value "gcf_gen1"
   */
  cpu?: number | "gcf_gen1";

  /**
   * Connect cloud function to specified VPC connector.
   */
  vpcConnector?: string | Expression<string> | ResetValue;

  /**
   * Egress settings for VPC connector.
   */
  vpcConnectorEgressSettings?: options.VpcEgressSetting | ResetValue;

  /**
   * Specific service account for the function to run as.
   */
  serviceAccount?: string | Expression<string> | ResetValue;

  /**
   * Ingress settings which control where this function can be called from.
   */
  ingressSettings?: options.IngressSetting | ResetValue;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /*
   * Secrets to bind to a function.
   */
  secrets?: (string | SecretParam)[];

  /** Whether failed executions should be delivered again. */
  retry?: boolean | Expression<boolean> | ResetValue;
}

/**
 * Handle a message being published to a Pub/Sub topic.
 * @param topic - The Pub/Sub topic to watch for message events.
 * @param handler - runs every time a Cloud Pub/Sub message is published
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export function onMessagePublished<T = any>(
  topic: string,
  handler: (event: CloudEvent<MessagePublishedData<T>>) => any | Promise<any>
): CloudFunction<CloudEvent<MessagePublishedData<T>>>;

/**
 * Handle a message being published to a Pub/Sub topic.
 * @param options - Option containing information (topic) for event
 * @param handler - runs every time a Cloud Pub/Sub message is published
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export function onMessagePublished<T = any>(
  options: PubSubOptions,
  handler: (event: CloudEvent<MessagePublishedData<T>>) => any | Promise<any>
): CloudFunction<CloudEvent<MessagePublishedData<T>>>;

/**
 * Handle a message being published to a Pub/Sub topic.
 * @param topicOrOptions - A string representing the PubSub topic or an option (which contains the topic)
 * @param handler - runs every time a Cloud Pub/Sub message is published
 * @typeParam T - Type representing `Message.data`'s JSON format
 */
export function onMessagePublished<T = any>(
  topicOrOptions: string | PubSubOptions,
  handler: (event: CloudEvent<MessagePublishedData<T>>) => any | Promise<any>
): CloudFunction<CloudEvent<MessagePublishedData<T>>> {
  let topic: string;
  let opts: options.EventHandlerOptions;
  if (typeof topicOrOptions === "string") {
    topic = topicOrOptions;
    opts = {};
  } else {
    topic = topicOrOptions.topic;
    opts = { ...topicOrOptions };
    delete (opts as any).topic;
  }

  const func = (raw: CloudEvent<unknown>) => {
    const messagePublishedData = raw.data as {
      message: unknown;
      subscription: string;
    };
    messagePublishedData.message = new Message(messagePublishedData.message);
    return wrapTraceContext(withInit(handler))(raw as CloudEvent<MessagePublishedData<T>>);
  };

  func.run = handler;

  Object.defineProperty(func, "__trigger", {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(options.getGlobalOptions());
      const specificOpts = options.optionsToTriggerAnnotations(opts);

      return {
        platform: "gcfv2",
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
        },
        eventTrigger: {
          eventType: "google.cloud.pubsub.topic.v1.messagePublished",
          resource: `projects/${process.env.GCLOUD_PROJECT}/topics/${topic}`,
        },
      };
    },
  });

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts);

  const endpoint: ManifestEndpoint = {
    ...initV2Endpoint(options.getGlobalOptions(), opts),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType: "google.cloud.pubsub.topic.v1.messagePublished",
      eventFilters: { topic },
      retry: opts.retry ?? false,
    },
  };
  copyIfPresent(endpoint.eventTrigger, opts, "retry", "retry");
  func.__endpoint = endpoint;

  return func;
}
