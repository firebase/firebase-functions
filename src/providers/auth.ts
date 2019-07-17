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

import * as firebase from 'firebase-admin';
import * as _ from 'lodash';
import {
  CloudFunction,
  Event,
  EventContext,
  makeCloudFunction,
} from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';

/** @hidden */
export const provider = 'google.firebase.auth';
/** @hidden */
export const service = 'firebaseauth.googleapis.com';

/**
 * Handle events related to Firebase authentication users.
 */
export function user() {
  return _userWithOptions({});
}

/** @hidden */
export function _userWithOptions(options: DeploymentOptions) {
  return new UserBuilder(() => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    return 'projects/' + process.env.GCLOUD_PROJECT;
  }, options);
}

export class UserRecordMetadata implements firebase.auth.UserMetadata {
  constructor(public creationTime: string, public lastSignInTime: string) {}

  /** Returns a plain JavaScript object with the properties of UserRecordMetadata. */
  toJSON() {
    return {
      creationTime: this.creationTime,
      lastSignInTime: this.lastSignInTime,
    };
  }
}

/** Builder used to create Cloud Functions for Firebase Auth user lifecycle events. */
export class UserBuilder {
  private static dataConstructor(raw: Event): firebase.auth.UserRecord {
    return userRecordConstructor(raw.data);
  }

  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options?: DeploymentOptions
  ) {}

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
}

/**
 * The UserRecord passed to Cloud Functions is the same UserRecord that is returned by the Firebase Admin
 * SDK.
 */
export type UserRecord = firebase.auth.UserRecord;

/**
 * UserInfo that is part of the UserRecord
 */
export type UserInfo = firebase.auth.UserInfo;

export function userRecordConstructor(
  wireData: Object
): firebase.auth.UserRecord {
  // Falsey values from the wire format proto get lost when converted to JSON, this adds them back.
  const falseyValues: any = {
    email: null,
    emailVerified: false,
    displayName: null,
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    providerData: [],
    customClaims: {},
    passwordSalt: null,
    passwordHash: null,
    tokensValidAfterTime: null,
  };
  const record = _.assign({}, falseyValues, wireData);

  const meta = _.get(record, 'metadata');
  if (meta) {
    _.set(
      record,
      'metadata',
      new UserRecordMetadata(
        meta.createdAt || meta.creationTime,
        meta.lastSignedInAt || meta.lastSignInTime
      )
    );
  } else {
    _.set(record, 'metadata', new UserRecordMetadata(null, null));
  }
  _.forEach(record.providerData, (entry) => {
    _.set(entry, 'toJSON', () => {
      return entry;
    });
  });
  _.set(record, 'toJSON', () => {
    const json: any = _.pick(record, [
      'uid',
      'email',
      'emailVerified',
      'displayName',
      'photoURL',
      'phoneNumber',
      'disabled',
      'passwordHash',
      'passwordSalt',
      'tokensValidAfterTime',
    ]);
    json.metadata = _.get(record, 'metadata').toJSON();
    json.customClaims = _.cloneDeep(record.customClaims);
    json.providerData = _.map(record.providerData, (entry) => entry.toJSON());
    return json;
  });
  return record as firebase.auth.UserRecord;
}
