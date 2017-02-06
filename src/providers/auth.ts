import { Event } from '../event';
import { makeCloudFunction, CloudFunction } from './base';
import * as firebase from 'firebase-admin';

/** @internal */
export const provider = 'google.firebase.auth';

/** Handle events in the Firebase Auth user lifecycle. */
export function user() {
  return new UserBuilder('projects/' + process.env.GCLOUD_PROJECT);
}

/** Builder used to create Cloud Functions for Firebase Auth user lifecycle events. */
export class UserBuilder {
  /** @internal */
  constructor(private resource: string) { }

  /** Respond to the creation of a Firebase Auth user. */
  onCreate(handler: (event: Event<firebase.auth.UserRecord>) => any | PromiseLike<any>): CloudFunction {
    return makeCloudFunction({
      provider, handler,
      resource: this.resource,
      eventType: 'user.create',
    });
  }

  /** Respond to the deletion of a Firebase Auth user. */
  onDelete(handler: (event: Event<firebase.auth.UserRecord>) => any | PromiseLike<any>): CloudFunction {
    return makeCloudFunction({
      provider, handler,
      resource: this.resource,
      eventType: 'user.delete',
    });
  }
}
