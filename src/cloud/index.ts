import CloudHttpsBuilder from './https-builder';
import CloudPubsubBuilder from './pubsub-builder';
import CloudStorageBuilder from './storage-builder';
import { FirebaseEnv } from '../env';

export default class CloudBuilders {
  private _env: FirebaseEnv;

  constructor(env: FirebaseEnv) {
    this._env = env;
  }

  https(): CloudHttpsBuilder {
    return new CloudHttpsBuilder(this._env);
  }

  http(): CloudHttpsBuilder {
    console.warn('DEPRECATION NOTICE: cloud.http() is deprecated, use cloud.https()');
    return this.https();
  }

  pubsub(topic: string): CloudPubsubBuilder {
    return new CloudPubsubBuilder(this._env, topic);
  }

  storage(bucket: string): CloudStorageBuilder {
    return new CloudStorageBuilder(this._env, bucket);
  }
}
