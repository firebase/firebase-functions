import { BlockingFunction } from '../../cloud-functions';
import {
  AuthBlockingEvent,
  BeforeCreateResponse,
  BeforeSignInResponse,
  createV2Handler,
  PublicKeysCache,
} from '../../common/providers/identity';
import * as options from '../options';

export interface BlockingOptions extends options.GlobalOptions {
  idToken?: boolean;
  accessToken?: boolean;
  refreshToken?: boolean;
}

interface InternalOptions {
  opts: options.GlobalOptions;
  idToken: boolean;
  accessToken: boolean;
  refreshToken: boolean;
}

export function beforeUserCreated(
  handler: (
    event: AuthBlockingEvent
  ) =>
    | BeforeCreateResponse
    | Promise<BeforeCreateResponse>
    | void
    | Promise<void>
): BlockingFunction;
export function beforeUserCreated(
  opts: BlockingOptions,
  handler: (
    event: AuthBlockingEvent
  ) =>
    | BeforeCreateResponse
    | Promise<BeforeCreateResponse>
    | void
    | Promise<void>
): BlockingFunction;
export function beforeUserCreated(
  optsOrHandler:
    | BlockingOptions
    | ((
        event: AuthBlockingEvent
      ) =>
        | BeforeCreateResponse
        | Promise<BeforeCreateResponse>
        | void
        | Promise<void>),
  handler?: (
    event: AuthBlockingEvent
  ) =>
    | BeforeCreateResponse
    | Promise<BeforeCreateResponse>
    | void
    | Promise<void>
): BlockingFunction {
  return beforeOperation('beforeCreate', optsOrHandler, handler);
}

export function beforeUserSignedIn(
  handler: (
    event: AuthBlockingEvent
  ) =>
    | BeforeSignInResponse
    | Promise<BeforeSignInResponse>
    | void
    | Promise<void>
): BlockingFunction;
export function beforeUserSignedIn(
  opts: BlockingOptions,
  handler: (
    event: AuthBlockingEvent
  ) =>
    | BeforeSignInResponse
    | Promise<BeforeSignInResponse>
    | void
    | Promise<void>
): BlockingFunction;
export function beforeUserSignedIn(
  optsOrHandler:
    | BlockingOptions
    | ((
        event: AuthBlockingEvent
      ) =>
        | BeforeSignInResponse
        | Promise<BeforeSignInResponse>
        | void
        | Promise<void>),
  handler?: (
    event: AuthBlockingEvent
  ) =>
    | BeforeSignInResponse
    | Promise<BeforeSignInResponse>
    | void
    | Promise<void>
): BlockingFunction {
  return beforeOperation('beforeSignIn', optsOrHandler, handler);
}

/** @internal */
export function beforeOperation(
  eventType: string,
  optsOrHandler:
    | BlockingOptions
    | ((
        event: AuthBlockingEvent
      ) =>
        | BeforeCreateResponse
        | BeforeSignInResponse
        | void
        | Promise<BeforeCreateResponse>
        | Promise<BeforeSignInResponse>
        | Promise<void>),
  handler: (
    event: AuthBlockingEvent
  ) =>
    | BeforeCreateResponse
    | BeforeSignInResponse
    | void
    | Promise<BeforeCreateResponse>
    | Promise<BeforeSignInResponse>
    | Promise<void>
): BlockingFunction {
  if (!handler || typeof optsOrHandler === 'function') {
    handler = optsOrHandler as (
      event: AuthBlockingEvent
    ) =>
      | BeforeCreateResponse
      | BeforeSignInResponse
      | void
      | Promise<BeforeCreateResponse>
      | Promise<BeforeSignInResponse>
      | Promise<void>;
    optsOrHandler = {};
  }

  const { opts, accessToken, idToken, refreshToken } = getOpts(
    optsOrHandler as BlockingOptions
  );

  // TODO(colerogers): yank when admin sdk changes are released
  const keysCache: PublicKeysCache = {
    publicKeys: {},
  };

  const func: any = createV2Handler(eventType, handler, keysCache);

  const legacyEventType = `providers/cloud.auth/eventTypes/user.${eventType}`;

  /** Trigger */
  const baseOptsTrigger = options.optionsToTriggerAnnotations(
    options.getGlobalOptions()
  );
  const specificOptsTrigger = options.optionsToTriggerAnnotations(opts);
  func.__trigger = {
    apiVersion: 2,
    platform: 'gcfv2',
    ...baseOptsTrigger,
    ...specificOptsTrigger,
    labels: {
      ...baseOptsTrigger?.labels,
      ...specificOptsTrigger?.labels,
    },
    blockingTrigger: {
      legacyEventType,
      options: {
        accessToken,
        idToken,
        refreshToken,
      },
    },
  };

  /** Endpoint */
  const baseOptsEndpoint = options.optionsToEndpoint(
    options.getGlobalOptions()
  );
  const specificOptsEndpoint = options.optionsToEndpoint(opts);
  func.__endpoint = {
    platform: 'gcfv2',
    ...baseOptsEndpoint,
    ...specificOptsEndpoint,
    labels: {
      ...baseOptsEndpoint?.labels,
      ...specificOptsEndpoint?.labels,
    },
    blockingTrigger: {
      legacyEventType,
      options: {
        accessToken,
        idToken,
        refreshToken,
      },
    },
  };

  func.__requiredAPIs = [
    {
      api: 'identitytoolkit.googleapis.com',
      reason: 'Needed for auth blocking functions',
    },
  ];

  func.run = handler;

  return func;
}

/** @internal */
export function getOpts(blockingOptions: BlockingOptions): InternalOptions {
  const accessToken = blockingOptions.accessToken || false;
  const idToken = blockingOptions.idToken || false;
  const refreshToken = blockingOptions.refreshToken || false;
  const opts = { ...blockingOptions };
  delete (opts as any).accessToken;
  delete (opts as any).idToken;
  delete (opts as any).refresh;
  return {
    opts,
    accessToken,
    idToken,
    refreshToken,
  };
}