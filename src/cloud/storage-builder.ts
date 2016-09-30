import { FunctionBuilder, TriggerDefinition, TriggerAnnotated } from '../builder';
import { Event, RawEvent } from '../event';
import { FirebaseEnv } from '../env';

export interface StorageObjectAccessControl {
  kind: string;
  id: string;
  role: string;
  selfLink?: string;
  bucket?: string;
  object?: string;
  generation?: number;
  entity?: string;
  email?: string;
  entityId?: string;
  domain?: string;
  projectTeam?: {
    projectNumber?: string,
    team?: string,
  };
  etag?: string;
}

export interface StorageObject {
  kind: string;
  id: string;
  selfLink?: string;
  name?: string;
  bucket: string;
  generation?: number;
  metageneration?: number;
  contentType?: string;
  timeCreated?: string;
  updated?: string;
  timeDeleted?: string;
  storageClass?: string;
  size?: number;
  md5Hash?: string;
  mediaLink?: string;
  contentEncoding?: string;
  contentDisposition?: string;
  contentLanguage?: string;
  cacheControl?: string;
  metadata?: {
    [key: string]: string,
  };
  acl?: Array<StorageObjectAccessControl>;
  owner?: {
    entity?: string,
    entityId?: string,
  };
  crc32c?: string;
  componentCount?: number;
  etag?: string;
  customerEncryption?: {
    encryptionAlgorithm?: string,
    keySha256?: string,
  };
}

export interface CloudStorageTriggerDefinition extends TriggerDefinition {
  bucket: string;
}

export default class CloudStorageBuilder extends FunctionBuilder {
  bucket: string;

  constructor(env: FirebaseEnv, bucket: string) {
    super(env);
    this.bucket = bucket;
  }

  on(
    event: string, handler: (event: Event<StorageObject>) => PromiseLike<any> | any
  ): TriggerAnnotated & ((event: RawEvent) => PromiseLike<any> | any) {
    if (event !== 'change') {
      throw new Error(`Provider cloud.storage does not support event type "${event}"`);
    }

    console.warn(
      'DEPRECATION NOTICE: cloud.storage("bucket").on("change", handler) is deprecated,' +
      'use cloud.storage("bucket").onChange(handler)'
    );
    return this._makeHandler(handler, 'change');
  }

  onChange(
    handler: (event: Event<StorageObject>) => PromiseLike<any>
  ): TriggerAnnotated & ((event: Event<StorageObject>) => PromiseLike<any> | any) {
    return this._wrapHandler(handler, 'change', {
        action: 'sources/cloud.storage/actions/change',
        resource: 'projects/' + process.env.GCLOUD_PROJECT + '/buckets/' + this.bucket,
    });
  }

  protected _toTrigger(event: string): CloudStorageTriggerDefinition {
    return {
      service: 'cloud.storage',
      bucket: this.bucket,
      event,
    };
  }
}
