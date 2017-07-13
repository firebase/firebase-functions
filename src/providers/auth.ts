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

import { makeCloudFunction, CloudFunction, Event } from '../cloud-functions';
import * as firebase from 'firebase-admin';
import * as _ from 'lodash';

/** @internal */
export const provider = 'firebase.auth';

/** Handle events in the Firebase Auth user lifecycle. */
export function user() {
  return new UserBuilder('projects/' + process.env.GCLOUD_PROJECT);
}

export class UserRecordMetadata implements firebase.auth.UserMetadata {

  constructor(public creationTime: string, public lastSignInTime: string) { };

  // Remove in v1.0.0
  /** @internal */
  get lastSignedInAt() {
    console.warn('WARNING: "lastSignedInAt" will be removed in firebase-functions v1.0.0. ' +
    'Please start using "lastSignInTime", which is an ISO string.');
    return new Date(this.lastSignInTime);
  }

  // Remove in v1.0.0
  /** @internal */
  get createdAt() {
    console.warn('WARNING: "createdAt" will be removed in firebase-functions v1.0.0. ' +
    'Please start using "creationTime", which is an ISO string.');
    return new Date(this.creationTime);
  }

  toJSON() {
    return {
      creationTime: this.creationTime,
      lastSignInTime: this.lastSignInTime,
    };
  }
}

/** Builder used to create Cloud Functions for Firebase Auth user lifecycle events. */
export class UserBuilder {
  private static dataConstructor(raw: any): firebase.auth.UserRecord {
    // The UserRecord returned here is an interface. The firebase-admin/auth/user-record module
    // also has a class of the same name, which is one implementation of the interface.

    // Transform payload to firebase-admin v5.0.0 format
    let data = _.clone(raw.data);
    if (data.metadata) {
      let meta = data.metadata;
      data.metadata = new UserRecordMetadata(
        meta.createdAt || meta.creationTime,
        meta.lastSignedInAt || meta.lastSignInTime,
      );
    }

    return data;
  }

  /** @internal */
  constructor(private resource: string) { }

  /** Respond to the creation of a Firebase Auth user. */
  onCreate(
    handler: (event: Event<UserRecord>) => PromiseLike<any> | any
  ): CloudFunction<UserRecord> {
    return makeCloudFunction({
      provider, handler,
      resource: this.resource,
      eventType: 'user.create',
      dataConstructor: UserBuilder.dataConstructor,
    });
  }

  /** Respond to the deletion of a Firebase Auth user. */
  onDelete(
    handler: (event: Event<UserRecord>) => PromiseLike<any> | any
  ): CloudFunction<UserRecord> {
    return makeCloudFunction({
      provider, handler,
      resource: this.resource,
      eventType: 'user.delete',
      dataConstructor: UserBuilder.dataConstructor,
    });
  }
}

/**
 * The UserRecord passed to Cloud Functions is the same UserRecord that is returned by the Firebase Admin
 * SDK.
 */
export type UserRecord = firebase.auth.UserRecord;
