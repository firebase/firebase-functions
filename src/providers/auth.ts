import { Event } from '../event';
import { AbstractFunctionBuilder, Trigger, CloudFunction } from './base';

export function auth() {
  return new auth.FunctionBuilder();
}

export namespace auth {
  export interface UserInfo {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    providerId: string;
  }

  export interface UserRecord {
    uid: string;
    email: string;
    emailVerified: boolean;
    displayName?: string;
    photoURL?: string;
    disabled: boolean;
    metadata: {
      createdAt: string;
      lastSignedInAt: string;
    };
    providerData?: Array<UserInfo>;
  }

  export class FunctionBuilder extends AbstractFunctionBuilder {
    onCreate(handler: (event: Event<UserRecord>) => PromiseLike<any>): CloudFunction {
      return this._makeHandler(handler, 'user.create');
    }

    onDelete(handler: (event: Event<UserRecord>) => PromiseLike<any>): CloudFunction {
      return this._makeHandler(handler, 'user.delete');
    }

    protected _toTrigger(event: string): Trigger {
      return {
        eventTrigger: {
          eventType: 'providers/firebase.auth/eventTypes/' + event,
          resource: 'projects/' + process.env.GCLOUD_PROJECT,
        },
      };
    }
  }
}
