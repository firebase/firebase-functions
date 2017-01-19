import { FunctionBuilder, TriggerDefinition, TriggerAnnotated } from '../builder';
import { Event } from '../event';
import { FirebaseEnv } from '../env';

export interface UserInfo {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  providerId: string;
}

export interface AuthEventData {
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

export default class AuthBuilder extends FunctionBuilder {

  constructor(env: FirebaseEnv) {
    super(env);
  }

  onCreate(
    handler: (event: Event<AuthEventData>) => PromiseLike<any>
  ): TriggerAnnotated & ((event: Event<AuthEventData>) => PromiseLike<any> | any) {
    return this._makeHandler(handler, 'user.create');
  }

  onDelete(
    handler: (event: Event<AuthEventData>) => PromiseLike<any>
  ): TriggerAnnotated & ((event: Event<AuthEventData>) => PromiseLike<any> | any) {
    return this._makeHandler(handler, 'user.delete');
  }

  protected _toTrigger(event: string): TriggerDefinition {
    return {
      eventTrigger: {
        eventType: 'providers/firebase.auth/eventTypes/' + event,
        resource: 'projects/' + process.env.GCLOUD_PROJECT,
      },
    };
  }
}
