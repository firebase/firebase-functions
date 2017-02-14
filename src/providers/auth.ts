 // The MIT License (MIT)
 //
 // Copyright (c) 2015 Firebase
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

/** @internal */
export const provider = 'firebase.auth';

/** Handle events in the Firebase Auth user lifecycle. */
export function user() {
  return new UserBuilder('projects/' + process.env.GCLOUD_PROJECT);
}

/** Builder used to create Cloud Functions for Firebase Auth user lifecycle events. */
export class UserBuilder {
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
    });
  }
}

 /**
  * The UserRecord passed to Cloud Functions is the same UserRecord that is returned by the Firebase Admin
  * SDK.
  */
export type UserRecord = firebase.auth.UserRecord;
