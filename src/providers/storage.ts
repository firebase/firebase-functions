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

/** @hidden */
export const provider = 'google.storage';
/** @hidden */
export const service = 'storage.googleapis.com';

/**
 * Registers a Cloud Function scoped to a specific storage bucket.
 *
 * @param bucket Name of the bucket to which this Cloud Function is
 *   scoped.
 *
 * @return Storage bucket builder interface.
 */
export function bucket(bucket?: string) {
  return _bucketWithOptions({}, bucket);
}

/**
 * Registers a Cloud Function scoped to the default storage bucket for the
 * project.
 *
 * @return Storage object builder interface.
 */
export function object() {
  return _objectWithOptions({});
}

/** @hidden */
export function _bucketWithOptions(
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

/** @hidden */
export function _objectWithOptions(options: DeploymentOptions): ObjectBuilder {
  return _bucketWithOptions(options).object();
}

/**
 * The Google Cloud Storage bucket builder interface.
 *
 * Access via [`functions.storage.bucket()`](providers_storage_.html#bucket).
 */
export class BucketBuilder {
  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  /**
   * Event handler which fires every time a Google Cloud Storage change occurs.
   *
   * @return Storage object builder interface scoped to the specified storage
   *   bucket.
   */
  object() {
    return new ObjectBuilder(this.triggerResource, this.options);
  }
}

/**
 * The Google Cloud Storage object builder interface.
 *
 * Access via [`functions.storage.object()`](providers_storage_.html#object).
 */
export class ObjectBuilder {
  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  /** @hidden */
  onChange(handler: any): Error {
    throw new Error(
      '"onChange" is now deprecated, please use "onArchive", "onDelete", ' +
        '"onFinalize", or "onMetadataUpdate".'
    );
  }

  /**
   * Event handler sent only when a bucket has enabled object versioning.
   * This event indicates that the live version of an object has become an
   * archived version, either because it was archived or because it was
   * overwritten by the upload of an object of the same name.
   *
   * @param handler Event handler which is run every time a Google Cloud Storage
   *   archival occurs.
   *
   * @return A Cloud Function which you can export and deploy.
   */
  onArchive(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<ObjectMetadata> {
    return this.onOperation(handler, 'object.archive');
  }

  /**
   * Event handler which fires every time a Google Cloud Storage deletion occurs.
   *
   * Sent when an object has been permanently deleted. This includes objects
   * that are overwritten or are deleted as part of the bucket's lifecycle
   * configuration. For buckets with object versioning enabled, this is not
   * sent when an object is archived, even if archival occurs
   * via the `storage.objects.delete` method.
   *
   * @param handler Event handler which is run every time a Google Cloud Storage
   *   deletion occurs.
   *
   * @return A Cloud Function which you can export and deploy.
   */
  onDelete(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<ObjectMetadata> {
    return this.onOperation(handler, 'object.delete');
  }

  /**
   * Event handler which fires every time a Google Cloud Storage object
   * creation occurs.
   *
   * Sent when a new object (or a new generation of an existing object)
   * is successfully created in the bucket. This includes copying or rewriting
   * an existing object. A failed upload does not trigger this event.
   *
   * @param handler Event handler which is run every time a Google Cloud Storage
   *   object creation occurs.
   *
   * @return A Cloud Function which you can export and deploy.
   */
  onFinalize(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<ObjectMetadata> {
    return this.onOperation(handler, 'object.finalize');
  }

  /**
   * Event handler which fires every time the metadata of an existing object
   * changes.
   *
   * @param handler Event handler which is run every time a Google Cloud Storage
   *   metadata update occurs.
   *
   * @return A Cloud Function which you can export and deploy.
   */
  onMetadataUpdate(
    handler: (
      object: ObjectMetadata,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<ObjectMetadata> {
    return this.onOperation(handler, 'object.metadataUpdate');
  }

  /** @hidden */
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

/** Interface representing a Google Google Cloud Storage object metadata object. */
export interface ObjectMetadata {
  /** The kind of the object, which is always `storage#object`. */
  kind: string;

  /**
   * The ID of the object, including the bucket name, object name, and
   * generation number.
   */
  id: string;

  /** Storage bucket that contains the object. */
  bucket: string;

  /** Storage class of the object. */
  storageClass: string;

  /**
   * The value of the `Content-Length` header, used to determine  the length of
   * the object data in bytes.
   */
  size: string;

  /** The creation time of the object in RFC 3339 format. */
  timeCreated: string;

  /**
   * The modification time of the object metadata in RFC 3339 format.
   */
  updated: string;

  /** Link to access the object, assuming you have sufficient permissions. */
  selfLink?: string;

  /**The object's name. */
  name?: string;

  /**
   * Generation version number that changes each time the object is
   * overwritten.
   */
  generation?: string;

  /** The object's content type, also known as the MIME type. */
  contentType?: string;

  /**
   * Meta-generation version number that changes each time the object's metadata
   * is updated.
   */
  metageneration?: string;

  /**
   * The deletion time of the object in RFC 3339 format. Returned
   * only if this version of the object has been deleted.
   */
  timeDeleted?: string;

  timeStorageClassUpdated?: string;

  /**
   * MD5 hash for the object. All Google Cloud Storage objects
   * have a CRC32C hash or MD5 hash.
   */
  md5Hash?: string;

  /** Media download link. */
  mediaLink?: string;

  /**
   * Content-Encoding to indicate that an object is compressed
   * (for example, with gzip compression) while maintaining its Content-Type.
   */
  contentEncoding?: string;

  /**
   * The value of the `Content-Disposition` header, used to specify presentation
   * information about the data being transmitted.
   */
  contentDisposition?: string;

  /** ISO 639-1 language code of the content. */
  contentLanguage?: string;

  /**
   * The value of the `Cache-Control` header, used to determine whether Internet
   * caches are allowed to cache public data for an object.
   */
  cacheControl?: string;

  /** User-provided metadata. */
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

  /**
   * The object's CRC32C hash. All Google Cloud Storage objects
   * have a CRC32C hash or MD5 hash.
   */
  crc32c?: string;

  /**
   * Specifies the number of originally uploaded objects from which
   * a composite object was created.
   */
  componentCount?: string;

  etag?: string;

  /**
   * Customer-supplied encryption key.
   *
   * This object contains the following properties:
   * * `encryptionAlgorithm` (`string|undefined`): The encryption algorithm that
   *   was used. Always contains the value `AES256`.
   * * `keySha256` (`string|undefined`): An RFC 4648 base64-encoded string of the
   *   SHA256 hash of your encryption key. You can use this SHA256 hash to
   *   uniquely identify the AES-256 encryption key required to decrypt the
   *   object, which you must store securely.
   */
  customerEncryption?: {
    encryptionAlgorithm?: string;
    keySha256?: string;
  };
}
