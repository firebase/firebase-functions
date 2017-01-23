import { AbstractFunctionBuilder, Trigger, CloudFunction } from './base';
import { Event } from '../event';

export function storage(bucket?: string) {
  return new storage.FunctionBuilder(bucket);
}

export namespace storage {
  export class FunctionBuilder extends AbstractFunctionBuilder {

    // TODO(inlined/longlauren): bucket should have a fallback that fetches the real bucket rather than expecting the
    // CLI to populate it.
    constructor(private bucket?: string) {
      super();
    }

    onChange(handler: (event: Event<storage.Object>) => PromiseLike<any>): CloudFunction {
      return this._makeHandler(handler, 'object.change');
    }

    protected _toTrigger(event: string): Trigger {
      let bucket;
      if (this.bucket) {
        const format = new RegExp('^(projects/_/buckets/)?([^/]+)$');
        let match;
        [match,,bucket] = this.bucket.match(format);
        if (!match) {
          const errorString = 'bucket names must either have the format of'
            + ' "bucketId" or "projects/_/buckets/<bucketId>".';
          throw new Error(errorString);
        }
      }
      return {
        eventTrigger: {
          eventType: 'providers/cloud.storage/eventTypes/' + event,
          resource: bucket ? 'projects/_/buckets/' + bucket : null,
        },
      };
    }
  }

  export interface AccessControl {
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

  export interface Object {
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
      [key: string]: string;
    };
    acl?: Array<AccessControl>;
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
}
