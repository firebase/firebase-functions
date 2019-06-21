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
  CloudFunction,
  EventContext,
  makeCloudFunction,
} from '../cloud-functions';
import { firebaseConfig } from '../config';
import { DeploymentOptions } from '../function-configuration';

/** @internal */
export const provider = 'google.storage';
/** @internal */
export const service = 'storage.googleapis.com';

/**
 * The optional bucket function allows you to choose which buckets' events to handle.
 * This step can be bypassed by calling object() directly, which will use the default
 * Cloud Storage for Firebase bucket.
 * @param bucket Name of the Google Cloud Storage bucket to listen to.
 */
export function bucket(bucket?: string) {
  return _bucketWithOpts({}, bucket);
}

/**
 * Handle events related to Cloud Storage objects.
 */
export function object() {
  return _objectWithOpts({});
}

/** @internal */
export function _bucketWithOpts(
  options: DeploymentOptions,
  bucket?: string
): BucketBuilder {
  const resourceGetter = () => {
    bucket = bucket || firebaseConfig().storageBucket;
    if (!bucket) {
      throw new Error(
        'Missing bucket name. If you are unit testing, please provide a bucket name' +
          ' through `functions.storage.bucket(bucketName)`, or set process.env.FIREBASE_CONFIG.'
      );
    }
    if (!/^[a-z\d][a-z\d\\._-]{1,230}[a-z\d]$/.test(bucket)) {
      throw new Error(`Invalid bucket name ${bucket}`);
    }
    return `projects/_/buckets/${bucket}`;
  };
  return new BucketBuilder(resourceGetter, options);
}

/** @internal */
export function _objectWithOpts(options: DeploymentOptions): ObjectBuilder {
  return _bucketWithOpts(options).object();
}

export class BucketBuilder {
  /** @internal */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  /** Handle events for objects in this bucket. */
  object() {
    return new ObjectBuilder(this.triggerResource, this.options);
  }
}

export class ObjectBuilder {
  /** @internal */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  /** @internal */
  onChange(handler: any): Error {
    throw new Error(
      '"onChange" is now deprecated, please use "onArchive", "onDelete", ' +
        '"onFinalize", or "onMetadataUpdate".'
    );
  }

  /** Respond to archiving of an object, this is only for buckets that enabled object versioning. */
  onArchive(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<ObjectMetadata> {
    return this.onOperation(handler, 'object.archive');
  }

  /** Respond to the deletion of an object (not to archiving, if object versioning is enabled). */
  onDelete(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<ObjectMetadata> {
    return this.onOperation(handler, 'object.delete');
  }

  /** Respond to the successful creation of an object. */
  onFinalize(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<ObjectMetadata> {
    return this.onOperation(handler, 'object.finalize');
  }

  /** Respond to metadata updates of existing objects. */
  onMetadataUpdate(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<ObjectMetadata> {
    return this.onOperation(handler, 'object.metadataUpdate');
  }

  private onOperation(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any,
    eventType: string
  ): CloudFunction<ObjectMetadata> {
    return makeCloudFunction({
      handler,
      provider,
      service,
      eventType,
      triggerResource: this.triggerResource,
      options: this.options,
    });
  }
}

export interface ObjectMetadata {
  kind: string;
  id: string;
  bucket: string;
  storageClass: string;
  size: string;
  timeCreated: string;
  updated: string;
  selfLink?: string;
  name?: string;
  generation?: string;
  contentType?: string;
  metageneration?: string;
  timeDeleted?: string;
  timeStorageClassUpdated?: string;
  md5Hash?: string;
  mediaLink?: string;
  contentEncoding?: string;
  contentDisposition?: string;
  contentLanguage?: string;
  cacheControl?: string;
  metadata?: {
    [key: string]: string;
  };
  acl?: [
    {
      kind?: string;
      id?: string;
      selfLink?: string;
      bucket?: string;
      object?: string;
      generation?: string;
      entity?: string;
      role?: string;
      email?: string;
      entityId?: string;
      domain?: string;
      projectTeam?: {
        projectNumber?: string;
        team?: string;
      };
      etag?: string;
    }
  ];
  owner?: {
    entity?: string;
    entityId?: string;
  };
  crc32c?: string;
  componentCount?: string;
  etag?: string;
  customerEncryption?: {
    encryptionAlgorithm?: string;
    keySha256?: string;
  };
}
