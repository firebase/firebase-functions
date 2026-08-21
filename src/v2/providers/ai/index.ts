// The MIT License (MIT)
//
// Copyright (c) 2024 Firebase
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
 * Cloud functions to handle AI provider events.
 * @packageDocumentation
 */

import * as express from "express";
import { CloudEvent } from "../../core";
import { HttpsFunction, HttpsError, FunctionsErrorCode } from "../https";
import { EventHandlerOptions } from "../../options";
import { wrapTraceContext } from "../../trace";
import { withInit } from "../../../common/onInit";
import { initV2Endpoint } from "../../../runtime/manifest";
import * as options from "../../options";

import { Expression } from "../../../params";
import { ResetValue } from "../../../common/options";
import * as logger from "../../../logger";

export { HttpsError };

/**
 * Mapping from FunctionsErrorCode strings to numeric RPC status codes.
 */
export const rpcCodeMap: Record<FunctionsErrorCode, number> = {
  ok: 0,
  cancelled: 1,
  unknown: 2,
  "invalid-argument": 3,
  "deadline-exceeded": 4,
  "not-found": 5,
  "already-exists": 6,
  "permission-denied": 7,
  unauthenticated: 16,
  "resource-exhausted": 8,
  "failed-precondition": 9,
  aborted: 10,
  "out-of-range": 11,
  unimplemented: 12,
  internal: 13,
  unavailable: 14,
  "data-loss": 15,
};

import {
  type GenerateContentRequest as VertexV1Beta1GenerateContentRequest,
  type GenerateContentResponse as VertexV1Beta1GenerateContentResponse,
  requestTypeName as vertexV1Beta1RequestTypeName,
  responseTypeName as vertexV1Beta1ResponseTypeName,
} from "./types/vertex/v1beta1";

import {
  type GenerateContentRequest as GeminiV1BetaGenerateContentRequest,
  type GenerateContentResponse as GeminiV1BetaGenerateContentResponse,
  requestTypeName as geminiV1BetaRequestTypeName,
  responseTypeName as geminiV1BetaResponseTypeName,
} from "./types/gemini/v1beta";

export {
  type VertexV1Beta1GenerateContentRequest,
  type VertexV1Beta1GenerateContentResponse,
  type GeminiV1BetaGenerateContentRequest,
  type GeminiV1BetaGenerateContentResponse,
};
type MultipleLocationsIf<Allowed extends boolean> = Allowed extends true ? string[] : never;

/**
 * Options for configuring AI webhook triggers.
 */
export interface WebhookOptions<Regional extends boolean = false>
  extends Omit<EventHandlerOptions, "location"> {
  /**
   * Region where functions should be deployed.
   */
  location?: string | Expression<string> | MultipleLocationsIf<Regional> | ResetValue;
  /**
   * Whether to handle regional webhooks.
   */
  regionalWebhook?: Regional;
}

/**
 * Information about a prompt template.
 */
export interface PromptTemplateInfo {
  /** The name of the prompt template. */
  templateName?: string;
}

/**
 * Authentication type of the caller.
 */
export type AuthType = "app_user" | "unauthenticated" | "unknown";

/**
 * Event type for beforeGenerate triggers.
 */
export const beforeGenerateEventType = "google.firebase.ailogic.v1.beforeGenerate";
/**
 * Event type for afterGenerate triggers.
 */
export const afterGenerateEventType = "google.firebase.ailogic.v1.afterGenerate";

/**
 * Union of all valid AI request payloads.
 */
export type AnyValidAIRequest =
  | GeminiV1BetaGenerateContentRequest
  | VertexV1Beta1GenerateContentRequest;
/**
 * Union of all valid AI response payloads.
 */
export type AnyValidAIResponse =
  | GeminiV1BetaGenerateContentResponse
  | VertexV1Beta1GenerateContentResponse;

/**
 * Identifier for the Gemini v1beta API.
 */
export const geminiV1Beta = "google.ai.generativelanguage.v1beta";
/**
 * Identifier for the Vertex AI v1beta1 API.
 */
export const vertexV1Beta1 = "google.cloud.aiplatform.v1beta1";
/**
 * Supported AI API types.
 */
export type SupportedAPI = typeof geminiV1Beta | typeof vertexV1Beta1;

/**
 * Generic type resolving to the corresponding AI request type based on the API identifier.
 */
export type AIRequest<API> = string extends API
  ? AnyValidAIRequest
  : API extends typeof geminiV1Beta
  ? GeminiV1BetaGenerateContentRequest
  : API extends typeof vertexV1Beta1
  ? VertexV1Beta1GenerateContentRequest
  : never;

/**
 * Generic type resolving to the corresponding AI response type based on the API identifier.
 */
export type AIResponse<API> = string extends API
  ? AnyValidAIResponse
  : API extends typeof geminiV1Beta
  ? GeminiV1BetaGenerateContentResponse
  : API extends typeof vertexV1Beta1
  ? VertexV1Beta1GenerateContentResponse
  : never;

/**
 * Data payload for beforeGenerateContent events.
 */
export interface BeforeGenerateContentData<API extends string = string> {
  /** The AI model name. */
  model: string;
  /** Template metadata if a prompt template is used. */
  template?: PromptTemplateInfo;
  /** The AI API identifier. */
  api: SupportedAPI;
  /** The incoming generate content request. */
  request: AIRequest<API>;
}

/**
 * Data payload for afterGenerateContent events.
 */
export interface AfterGenerateContentData<API extends string = string>
  extends BeforeGenerateContentData<API> {
  /** The generated content response. */
  response: AIResponse<API>;
}

/**
 * Event context and payload delivered to AI blocking handlers.
 */
export interface AIBlockingEvent<T = any> extends CloudEvent<T> {
  /** The authentication type of the caller. */
  authType: AuthType;
  /** The user ID if authenticated. */
  authId?: string;
  /** The auth claims token payload. */
  authClaims?: any;
  /** The resource name. */
  resourceName?: string;
  /** The Firebase app ID. */
  appId?: string;
  /** The display name of the user. */
  displayName?: string;
  /** The Android package name if request originates from Android. */
  androidPackageName?: string;
  /** The iOS bundle ID if request originates from iOS. */
  iosBundleId?: string;
}

type MaybeAsync<T> = T | Promise<T>;

/**
 * A blocking function returned by AI event handlers.
 */
export type BlockingFunction = HttpsFunction;

/**
 * Handles an event triggered before content is generated by an AI model.
 * @param callback - Event handler run before content generation.
 * @returns A blocking function that can be exported and deployed.
 */
export function beforeGenerateContent(
  callback: (
    event: AIBlockingEvent<BeforeGenerateContentData>
  ) => MaybeAsync<void | Partial<AnyValidAIRequest>>
): BlockingFunction;

/**
 * Handles an event triggered before content is generated by an AI model.
 * @param options - Configuration options for the webhook.
 * @param callback - Event handler run before content generation.
 * @returns A blocking function that can be exported and deployed.
 */
export function beforeGenerateContent<Regional extends boolean = false>(
  options: WebhookOptions<Regional>,
  callback: (
    event: AIBlockingEvent<BeforeGenerateContentData>
  ) => MaybeAsync<void | Partial<AnyValidAIRequest>>
): BlockingFunction;

export function beforeGenerateContent(
  optsOrCb:
    | WebhookOptions
    | ((
        event: AIBlockingEvent<BeforeGenerateContentData>
      ) => MaybeAsync<void | Partial<AnyValidAIRequest>>),
  cb?: (
    event: AIBlockingEvent<BeforeGenerateContentData>
  ) => MaybeAsync<void | Partial<AnyValidAIRequest>>
): BlockingFunction {
  let opts: WebhookOptions;
  let handler: (
    event: AIBlockingEvent<BeforeGenerateContentData>
  ) => MaybeAsync<void | Partial<AnyValidAIRequest>>;

  if (arguments.length === 1) {
    opts = {};
    handler = optsOrCb as any;
  } else {
    opts = optsOrCb as WebhookOptions;
    handler = cb;
  }

  let func: any = async (req: express.Request, res: express.Response) => {
    try {
      let event: unknown = req.body;
      if (Buffer.isBuffer(event)) {
        try {
          event = JSON.parse(event.toString("utf-8"));
        } catch (e: unknown) {
          logger.error("Invalid JSON body (Buffer):", e);
          throw new HttpsError("invalid-argument", "Invalid JSON body", e);
        }
      } else if (typeof event === "string") {
        try {
          event = JSON.parse(event);
        } catch (e: unknown) {
          logger.error("Invalid JSON body (String):", e);
          throw new HttpsError("invalid-argument", "Invalid JSON body", e);
        }
      }
      const parsedEvent = event as AIBlockingEvent<BeforeGenerateContentData>;
      const result = await handler(parsedEvent);
      const responseBody = result || {};
      if (typeof responseBody === "object") {
        const api = parsedEvent.data?.api;
        if (api === geminiV1Beta) {
          (responseBody as any)["@type"] = geminiV1BetaRequestTypeName;
        } else if (api === vertexV1Beta1) {
          (responseBody as any)["@type"] = vertexV1Beta1RequestTypeName;
        }
      }
      res.status(200).send(responseBody);
    } catch (err: unknown) {
      logger.error("Unhandled error:", err);
      if (err instanceof HttpsError) {
        res.status(500).send({
          code: rpcCodeMap[err.code] || 13,
          message: err.message,
        });
      } else {
        res.status(500).send({
          code: 13,
          message: "Internal error.",
        });
      }
    }
  };

  func.run = handler;
  func = wrapTraceContext(withInit(func));

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts, "https");
  func.__endpoint = {
    ...initV2Endpoint(options.getGlobalOptions(), opts),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    blockingTrigger: {
      eventType: beforeGenerateEventType,
      options: {
        regionalWebhook: opts.regionalWebhook,
      },
    },
  };

  return func as BlockingFunction;
}

/**
 * Handles an event triggered after content is generated by an AI model.
 * @param callback - Event handler run after content generation.
 * @returns A blocking function that can be exported and deployed.
 */
export function afterGenerateContent(
  callback: (
    event: AIBlockingEvent<AfterGenerateContentData>
  ) => MaybeAsync<void | Partial<AnyValidAIResponse>>
): BlockingFunction;

/**
 * Handles an event triggered after content is generated by an AI model.
 * @param options - Configuration options for the webhook.
 * @param callback - Event handler run after content generation.
 * @returns A blocking function that can be exported and deployed.
 */
export function afterGenerateContent<Regional extends boolean = false>(
  options: WebhookOptions<Regional>,
  callback: (
    event: AIBlockingEvent<AfterGenerateContentData>
  ) => MaybeAsync<void | Partial<AnyValidAIResponse>>
): BlockingFunction;

export function afterGenerateContent(
  optsOrCb:
    | WebhookOptions
    | ((
        event: AIBlockingEvent<AfterGenerateContentData>
      ) => MaybeAsync<void | Partial<AnyValidAIResponse>>),
  cb?: (
    event: AIBlockingEvent<AfterGenerateContentData>
  ) => MaybeAsync<void | Partial<AnyValidAIResponse>>
): BlockingFunction {
  let opts: WebhookOptions;
  let handler: (
    event: AIBlockingEvent<AfterGenerateContentData>
  ) => MaybeAsync<void | Partial<AnyValidAIResponse>>;

  if (arguments.length === 1) {
    opts = {};
    handler = optsOrCb as any;
  } else {
    opts = optsOrCb as WebhookOptions;
    handler = cb;
  }

  let func: any = async (req: express.Request, res: express.Response) => {
    try {
      let event: unknown = req.body;
      if (Buffer.isBuffer(event)) {
        try {
          event = JSON.parse(event.toString("utf-8"));
        } catch (e: unknown) {
          logger.error("Invalid JSON body (Buffer):", e);
          throw new HttpsError("invalid-argument", "Invalid JSON body", e);
        }
      } else if (typeof event === "string") {
        try {
          event = JSON.parse(event);
        } catch (e: unknown) {
          logger.error("Invalid JSON body (String):", e);
          throw new HttpsError("invalid-argument", "Invalid JSON body", e);
        }
      }
      const parsedEvent = event as AIBlockingEvent<AfterGenerateContentData>;
      const result = await handler(parsedEvent);
      const responseBody = result || {};
      if (typeof responseBody === "object") {
        const api = parsedEvent.data?.api;
        if (api === geminiV1Beta) {
          (responseBody as any)["@type"] = geminiV1BetaResponseTypeName;
        } else if (api === vertexV1Beta1) {
          (responseBody as any)["@type"] = vertexV1Beta1ResponseTypeName;
        }
      }
      res.status(200).send(responseBody);
    } catch (err: unknown) {
      logger.error("Unhandled error:", err);
      if (err instanceof HttpsError) {
        res.status(500).send({
          code: rpcCodeMap[err.code] || 13,
          message: err.message,
        });
      } else {
        res.status(500).send({
          code: 13,
          message: "Internal error.",
        });
      }
    }
  };

  func.run = handler;
  func = wrapTraceContext(withInit(func));

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts, "https");
  func.__endpoint = {
    ...initV2Endpoint(options.getGlobalOptions(), opts),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    blockingTrigger: {
      eventType: afterGenerateEventType,
      options: {
        regionalWebhook: opts.regionalWebhook,
      },
    },
  };

  return func as BlockingFunction;
}
