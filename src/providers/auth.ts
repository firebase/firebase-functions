// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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

import {
  UserRecord,
  UserInfo,
  UserRecordMetadata,
  userRecordConstructor,
  AuthUserRecord,
  AuthEventContext,
  BeforeCreateResponse,
  BeforeSignInResponse,
  createHandler,
  PublicKeysCache,
} from '../common/providers/identity';
import {
  BlockingFunction,
  CloudFunction,
  Event,
  EventContext,
  makeCloudFunction,
  optionsToEndpoint,
  optionsToTrigger,
} from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';

// TODO: yank in next breaking change release
export { UserRecord, UserInfo, UserRecordMetadata, userRecordConstructor };

/** @hidden */
export const provider = 'google.firebase.auth';
/** @hidden */
export const service = 'firebaseauth.googleapis.com';

/** Resource level options */
export interface UserOptions {
  blockingOptions: {
    idToken?: boolean;
    accessToken?: boolean;
    refreshToken?: boolean;
  };
};

/**
 * Handle events related to Firebase authentication users.
 */
export function user(userOptions?: UserOptions) {
  return _userWithOptions({});
}

/** @hidden */
export function _userWithOptions(options: DeploymentOptions, userOptions?: UserOptions) {
  return new UserBuilder(() => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    return 'projects/' + process.env.GCLOUD_PROJECT;
  }, options, userOptions);
}

/** Builder used to create Cloud Functions for Firebase Auth user lifecycle events. */
export class UserBuilder {
  private keysCache: PublicKeysCache;

  private static dataConstructor(raw: Event): UserRecord {
    return userRecordConstructor(raw.data);
  }

  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions,
    private userOptions?: UserOptions,
  ) {
    this.keysCache = {
      publicKeys: {}
    }
  }

  /** Respond to the creation of a Firebase Auth user. */
  onCreate(
    handler: (user: UserRecord, context: EventContext) => PromiseLike<any> | any
  ): CloudFunction<UserRecord> {
    return this.onOperation(handler, 'user.create');
  }

  /** Respond to the deletion of a Firebase Auth user. */
  onDelete(
    handler: (user: UserRecord, context: EventContext) => PromiseLike<any> | any
  ): CloudFunction<UserRecord> {
    return this.onOperation(handler, 'user.delete');
  }

  beforeCreate(
    handler: (
      user: AuthUserRecord,
      context: AuthEventContext
    ) => BeforeCreateResponse | Promise<BeforeCreateResponse> | void | Promise<void>
  ): BlockingFunction {
    return this.beforeOperation(handler, 'providers/cloud.auth/eventTypes/user.beforeCreate');
  }

  beforeSignIn(
    handler: (
      user: AuthUserRecord,
      context: AuthEventContext
    ) => BeforeSignInResponse | Promise<BeforeSignInResponse> | void | Promise<void>
  ): BlockingFunction {
    return this.beforeOperation(handler, 'providers/cloud.auth/eventTypes/user.beforeSignIn');
  }

  private onOperation(
    handler: (
      user: UserRecord,
      context: EventContext
    ) => PromiseLike<any> | any,
    eventType: string
  ): CloudFunction<UserRecord> {
    return makeCloudFunction({
      handler,
      provider,
      eventType,
      service,
      triggerResource: this.triggerResource,
      dataConstructor: UserBuilder.dataConstructor,
      legacyEventType: `providers/firebase.auth/eventTypes/${eventType}`,
      options: this.options,
    });
  }

  private beforeOperation(
    handler: (
      user: AuthUserRecord,
      context: AuthEventContext
    ) => BeforeCreateResponse | Promise<BeforeCreateResponse> | BeforeSignInResponse | Promise<BeforeSignInResponse> | void | Promise<void>,
    eventType: string
  ): BlockingFunction {
    let accessToken = false, idToken = false, refreshToken = false;
    if (this.userOptions) {
      accessToken = this.userOptions.blockingOptions.accessToken;
      idToken = this.userOptions.blockingOptions.idToken;
      refreshToken = this.userOptions.blockingOptions.refreshToken;
    }

    const func: any = createHandler(handler, eventType, this.keysCache);
    
    func.__trigger = {
      labels: {},
      ...optionsToTrigger(this.options),
      blockingTrigger: {
        eventType,
        accessToken,
        idToken,
        refreshToken,
      },
    };
  
    func.__endpoint = {
      platform: 'gcfv1',
      labels: {},
      ...optionsToEndpoint(this.options),
      blockingTrigger: {
        eventType,
        accessToken,
        idToken,
        refreshToken,
      },
    };
  
    func.run = handler;
  
    return func;
  }
}
