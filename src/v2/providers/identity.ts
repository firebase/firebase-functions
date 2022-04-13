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
  globalOptions: options.GlobalOptions;
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
  const eventType = 'google.cloud.auth.user.v1.beforecreate';
  if (!handler) {
    handler = optsOrHandler as (
      event: AuthBlockingEvent
    ) =>
      | BeforeCreateResponse
      | Promise<BeforeCreateResponse>
      | void
      | Promise<void>;
    optsOrHandler = {};
  }
  const { globalOptions, accessToken, idToken, refreshToken } = getOpts(
    optsOrHandler as BlockingOptions
  );

  const keysCache: PublicKeysCache = {
    publicKeys: {},
  };
  const func: any = createV2Handler(handler, 'beforeCreate', keysCache);

  const baseOptsTrigger = options.optionsToTriggerAnnotations(
    options.getGlobalOptions()
  );
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToTriggerAnnotations handles both cases.
  const specificOptsTrigger = options.optionsToTriggerAnnotations(
    globalOptions
  );

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
      eventType,
      accessToken,
      idToken,
      refreshToken,
    },
  };

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToManifestEndpoint handles both cases.
  const specificOpts = options.optionsToEndpoint(globalOptions);

  func.__endpoint = {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    blockingTrigger: {
      eventType,
      accessToken,
      idToken,
      refreshToken,
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
  const eventType = 'google.cloud.auth.user.v1.beforesignin';
  if (!handler) {
    handler = optsOrHandler as (
      event: AuthBlockingEvent
    ) =>
      | BeforeCreateResponse
      | Promise<BeforeCreateResponse>
      | void
      | Promise<void>;
    optsOrHandler = {};
  }
  const { globalOptions, accessToken, idToken, refreshToken } = getOpts(
    optsOrHandler as BlockingOptions
  );

  const keysCache: PublicKeysCache = {
    publicKeys: {},
  };
  const func: any = createV2Handler(handler, 'beforeSignIn', keysCache);

  const baseOptsTrigger = options.optionsToTriggerAnnotations(
    options.getGlobalOptions()
  );
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToTriggerAnnotations handles both cases.
  const specificOptsTrigger = options.optionsToTriggerAnnotations(
    globalOptions
  );

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
      eventType,
      accessToken,
      idToken,
      refreshToken,
    },
  };

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToManifestEndpoint handles both cases.
  const specificOpts = options.optionsToEndpoint(globalOptions);

  func.__endpoint = {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    blockingTrigger: {
      eventType,
      accessToken,
      idToken,
      refreshToken,
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
  let opts = {};
  let accessToken = false,
    idToken = false,
    refreshToken = false;
  if (blockingOptions.accessToken) {
    accessToken = blockingOptions.accessToken;
  }
  if (blockingOptions.idToken) {
    idToken = blockingOptions.idToken;
  }
  if (blockingOptions.refreshToken) {
    refreshToken = blockingOptions.refreshToken;
  }
  opts = { ...blockingOptions };
  delete (opts as any).accessToken;
  delete (opts as any).idToken;
  delete (opts as any).refresh;
  return {
    globalOptions: opts,
    accessToken,
    idToken,
    refreshToken,
  };
}
