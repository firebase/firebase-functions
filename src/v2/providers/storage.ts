// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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

/**
 * Cloud functions to handle events from Google Cloud Storage.
 * @packageDocumentation
 */

import { firebaseConfig } from "../../common/config";
import { copyIfPresent } from "../../common/encoding";
import { ManifestEndpoint } from "../../runtime/manifest";
import { CloudEvent, CloudFunction } from "../core";
import { wrapTraceContext } from "../trace";
import * as options from "../options";
import { Expression } from "../../params";

/**
 * An object within Google Cloud Storage.
 * Ref: https://github.com/googleapis/google-cloudevents-nodejs/blob/main/cloud/storage/v1/StorageObjectData.ts
 */
export interface StorageObjectData {
  /**
   * The name of the bucket containing this object.
   */
  bucket?: string;
  /**
   * Cache-Control directive for the object data, matching
   * [https://tools.ietf.org/html/rfc7234#section-5.2"][RFC 7234 §5.2].
   */
  cacheControl?: string;
  /**
   * Number of underlying components that make up this object. Components are
   * accumulated by compose operations.
   * Attempting to set this field will result in an error.
   */
  componentCount?: number;
  /**
   * Content-Disposition of the object data, matching
   * [https://tools.ietf.org/html/rfc6266][RFC 6266].
   */
  contentDisposition?: string;
  /**
   * Content-Encoding of the object data, matching
   * [https://tools.ietf.org/html/rfc7231#section-3.1.2.2][RFC 7231 §3.1.2.2]
   */
  contentEncoding?: string;
  /**
   * Content-Language of the object data, matching
   * [https://tools.ietf.org/html/rfc7231#section-3.1.3.2][RFC 7231 §3.1.3.2].
   */
  contentLanguage?: string;
  /**
   * Content-Type of the object data, matching
   * [https://tools.ietf.org/html/rfc7231#section-3.1.1.5][RFC 7231 §3.1.1.5].
   * If an object is stored without a Content-Type, it is served as
   * `application/octet-stream`.
   */
  contentType?: string;
  /**
   * CRC32c checksum. For more information about using the CRC32c
   * checksum, see
   * [https://cloud.google.com/storage/docs/hashes-etags#_JSONAPI][Hashes and
   * ETags: Best Practices].
   */
  crc32c?: string;
  /**
   * Metadata of customer-supplied encryption key, if the object is encrypted by
   * such a key.
   */
  customerEncryption?: CustomerEncryption;
  /**
   * HTTP 1.1 Entity tag for the object. See
   * [https://tools.ietf.org/html/rfc7232#section-2.3][RFC 7232 §2.3].
   */
  etag?: string;
  /**
   * The content generation of this object. Used for object versioning.
   * Attempting to set this field will result in an error.
   */
  generation?: number;
  /**
   * The ID of the object, including the bucket name, object name, and
   * generation number.
   */
  id?: string;
  /**
   * The kind of item this is. For objects, this is always "storage#object".
   */
  kind?: string;
  /**
   * MD5 hash of the data; encoded using base64 as per
   * [https://tools.ietf.org/html/rfc4648#section-4][RFC 4648 §4]. For more
   * information about using the MD5 hash, see
   * [https://cloud.google.com/storage/docs/hashes-etags#_JSONAPI][Hashes and
   * ETags: Best Practices].
   */
  md5Hash?: string;
  /**
   * Media download link.
   */
  mediaLink?: string;
  /**
   * User-provided metadata, in key/value pairs.
   */
  metadata?: { [key: string]: string };
  /**
   * The version of the metadata for this object at this generation. Used for
   * preconditions and for detecting changes in metadata. A metageneration
   * number is only meaningful in the context of a particular generation of a
   * particular object.
   */
  metageneration?: number;
  /**
   * The name of the object.
   */
  name?: string;
  /**
   * The link to this object.
   */
  selfLink?: string;
  /**
   * Content-Length of the object data in bytes, matching
   * [https://tools.ietf.org/html/rfc7230#section-3.3.2][RFC 7230 §3.3.2].
   */
  size?: number;
  /**
   * Storage class of the object.
   */
  storageClass?: string;
  /**
   * The creation time of the object.
   * Attempting to set this field will result in an error.
   */
  timeCreated?: Date | string;
  /**
   * The deletion time of the object. Will be returned if and only if this
   * version of the object has been deleted.
   */
  timeDeleted?: Date | string;
  /**
   * The time at which the object's storage class was last changed.
   */
  timeStorageClassUpdated?: Date | string;
  /**
   * The modification time of the object metadata.
   */
  updated?: Date | string;
}

/**
 * Metadata of customer-supplied encryption key, if the object is encrypted by
 * such a key.
 */
export interface CustomerEncryption {
  /**
   * The encryption algorithm.
   */
  encryptionAlgorithm?: string;
  /**
   * SHA256 hash value of the encryption key.
   */
  keySha256?: string;
}

/** A CloudEvent that contains StorageObjectData */
export interface StorageEvent extends CloudEvent<StorageObjectData> {
  /** The name of the bucket containing this object. */
  bucket: string;
}

/** @internal */
export const archivedEvent = "google.cloud.storage.object.v1.archived";
/** @internal */
export const finalizedEvent = "google.cloud.storage.object.v1.finalized";
/** @internal */
export const deletedEvent = "google.cloud.storage.object.v1.deleted";
/** @internal */
export const metadataUpdatedEvent = "google.cloud.storage.object.v1.metadataUpdated";

/** StorageOptions extend EventHandlerOptions with a bucket name  */
export interface StorageOptions extends options.EventHandlerOptions {
  /** The name of the bucket containing this object. */
  bucket?: string;

  /**
   * Region where functions should be deployed.
   */
  region?: options.SupportedRegion | string;

  /**
   * Amount of memory to allocate to a function.
   * A value of null restores the defaults of 256MB.
   */
  memory?: options.MemoryOption | Expression<number> | null;

  /**
   * Timeout for the function in sections, possible values are 0 to 540.
   * HTTPS functions can specify a higher timeout.
   * A value of null restores the default of 60s
   * The minimum timeout for a gen 2 function is 1s. The maximum timeout for a
   * function depends on the type of function: Event handling functions have a
   * maximum timeout of 540s (9 minutes). HTTPS and callable functions have a
   * maximum timeout of 36,00s (1 hour). Task queue functions have a maximum
   * timeout of 1,800s (30 minutes)
   */
  timeoutSeconds?: number | Expression<number> | null;

  /**
   * Min number of actual instances to be running at a given time.
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   * A value of null restores the default min instances.
   */
  minInstances?: number | Expression<number> | null;

  /**
   * Max number of instances to be running in parallel.
   * A value of null restores the default max instances.
   */
  maxInstances?: number | Expression<number> | null;

  /**
   * Number of requests a function can serve at once.
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: number | Expression<number> | null;

  /**
   * Fractional number of CPUs to allocate to a function.
   * Defaults to 1 for functions with <= 2GB RAM and increases for larger memory sizes.
   * This is different from the defaults when using the gcloud utility and is different from
   * the fixed amount assigned in Google Cloud Functions generation 1.
   * To revert to the CPU amounts used in gcloud or in Cloud Functions generation 1, set this
   * to the value "gcf_gen1"
   */
  cpu?: number | "gcf_gen1";

  /**
   * Connect cloud function to specified VPC connector.
   * A value of null removes the VPC connector
   */
  vpcConnector?: string | null;

  /**
   * Egress settings for VPC connector.
   * A value of null turns off VPC connector egress settings
   */
  vpcConnectorEgressSettings?: options.VpcEgressSetting | null;

  /**
   * Specific service account for the function to run as.
   * A value of null restores the default service account.
   */
  serviceAccount?: string | null;

  /**
   * Ingress settings which control where this function can be called from.
   * A value of null turns off ingress settings.
   */
  ingressSettings?: options.IngressSetting | null;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /*
   * Secrets to bind to a function.
   */
  secrets?: string[];

  /** Whether failed executions should be delivered again. */
  retry?: boolean;
}

/**
 * Event handler sent only when a bucket has enabled object versioning.
 * This event indicates that the live version of an object has become an
 * archived version, either because it was archived or because it was
 * overwritten by the upload of an object of the same name.
 *
 * @param handler - Event handler which is run every time a Google Cloud Storage archival occurs.
 */
export function onObjectArchived(
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler sent only when a bucket has enabled object versioning.
 * This event indicates that the live version of an object has become an
 * archived version, either because it was archived or because it was
 * overwritten by the upload of an object of the same name.
 *
 * @param bucket - The name of the bucket containing this object.
 * @param handler - Event handler which is run every time a Google Cloud Storage archival occurs.
 */
export function onObjectArchived(
  bucket: string,
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler sent only when a bucket has enabled object versioning.
 * This event indicates that the live version of an object has become an
 * archived version, either because it was archived or because it was
 * overwritten by the upload of an object of the same name.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Google Cloud Storage archival occurs.
 */
export function onObjectArchived(
  opts: StorageOptions,
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler sent only when a bucket has enabled object versioning.
 * This event indicates that the live version of an object has become an
 * archived version, either because it was archived or because it was
 * overwritten by the upload of an object of the same name.
 *
 * @param bucketOrOptsOrHandler - Options or string that may (or may not) define the bucket to be used.
 * @param handler - Event handler which is run every time a Google Cloud Storage archival occurs.
 */
export function onObjectArchived(
  bucketOrOptsOrHandler: string | StorageOptions | ((event: StorageEvent) => any | Promise<any>),
  handler?: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent> {
  return onOperation(archivedEvent, bucketOrOptsOrHandler, handler);
}

/**
 * Event handler which fires every time a Google Cloud Storage object
 * creation occurs.
 *
 * Sent when a new object (or a new generation of an existing object)
 * is successfully created in the bucket. This includes copying or rewriting
 * an existing object. A failed upload does not trigger this event.
 *
 * @param handler - Event handler which is run every time a Google Cloud Storage object creation occurs.
 */
export function onObjectFinalized(
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time a Google Cloud Storage object
 * creation occurs.
 *
 * Sent when a new object (or a new generation of an existing object)
 * is successfully created in the bucket. This includes copying or rewriting
 * an existing object. A failed upload does not trigger this event.
 *
 * @param bucket - The name of the bucket containing this object.
 * @param handler - Event handler which is run every time a Google Cloud Storage object creation occurs.
 */
export function onObjectFinalized(
  bucket: string,
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time a Google Cloud Storage object
 * creation occurs.
 *
 * Sent when a new object (or a new generation of an existing object)
 * is successfully created in the bucket. This includes copying or rewriting
 * an existing object. A failed upload does not trigger this event.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Google Cloud Storage object creation occurs.
 */
export function onObjectFinalized(
  opts: StorageOptions,
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time a Google Cloud Storage object
 * creation occurs.
 *
 * Sent when a new object (or a new generation of an existing object)
 * is successfully created in the bucket. This includes copying or rewriting
 * an existing object. A failed upload does not trigger this event.
 *
 * @param bucketOrOptsOrHandler - Options or string that may (or may not) define the bucket to be used.
 * @param handler - Event handler which is run every time a Google Cloud Storage object creation occurs.
 */
export function onObjectFinalized(
  bucketOrOptsOrHandler: string | StorageOptions | ((event: StorageEvent) => any | Promise<any>),
  handler?: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent> {
  return onOperation(finalizedEvent, bucketOrOptsOrHandler, handler);
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
 * @param handler - Event handler which is run every time a Google Cloud Storage object deletion occurs.
 */
export function onObjectDeleted(
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time a Google Cloud Storage deletion occurs.
 *
 * Sent when an object has been permanently deleted. This includes objects
 * that are overwritten or are deleted as part of the bucket's lifecycle
 * configuration. For buckets with object versioning enabled, this is not
 * sent when an object is archived, even if archival occurs
 * via the `storage.objects.delete` method.
 *
 * @param bucket - The name of the bucket containing this object.
 * @param handler - Event handler which is run every time a Google Cloud Storage object deletion occurs.
 */
export function onObjectDeleted(
  bucket: string,
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time a Google Cloud Storage deletion occurs.
 *
 * Sent when an object has been permanently deleted. This includes objects
 * that are overwritten or are deleted as part of the bucket's lifecycle
 * configuration. For buckets with object versioning enabled, this is not
 * sent when an object is archived, even if archival occurs
 * via the `storage.objects.delete` method.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Google Cloud Storage object deletion occurs.
 */
export function onObjectDeleted(
  opts: StorageOptions,
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time a Google Cloud Storage deletion occurs.
 *
 * Sent when an object has been permanently deleted. This includes objects
 * that are overwritten or are deleted as part of the bucket's lifecycle
 * configuration. For buckets with object versioning enabled, this is not
 * sent when an object is archived, even if archival occurs
 * via the `storage.objects.delete` method.
 *
 * @param bucketOrOptsOrHandler - Options or string that may (or may not) define the bucket to be used.
 * @param handler - Event handler which is run every time a Google Cloud Storage object deletion occurs.
 */
export function onObjectDeleted(
  bucketOrOptsOrHandler: string | StorageOptions | ((event: StorageEvent) => any | Promise<any>),
  handler?: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent> {
  return onOperation(deletedEvent, bucketOrOptsOrHandler, handler);
}

/**
 * Event handler which fires every time the metadata of an existing object
 * changes.
 *
 * @param bucketOrOptsOrHandler - Options or string that may (or may not) define the bucket to be used.
 * @param handler - Event handler which is run every time a Google Cloud Storage object metadata update occurs.
 */
export function onObjectMetadataUpdated(
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time the metadata of an existing object
 * changes.
 *
 * @param bucket - The name of the bucket containing this object.
 * @param handler - Event handler which is run every time a Google Cloud Storage object metadata update occurs.
 */
export function onObjectMetadataUpdated(
  bucket: string,
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time the metadata of an existing object
 * changes.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Google Cloud Storage object metadata update occurs.
 */
export function onObjectMetadataUpdated(
  opts: StorageOptions,
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent>;

/**
 * Event handler which fires every time the metadata of an existing object
 * changes.
 *
 * @param bucketOrOptsOrHandler - Options or string that may (or may not) define the bucket to be used.
 * @param handler - Event handler which is run every time a Google Cloud Storage object metadata update occurs.
 */
export function onObjectMetadataUpdated(
  bucketOrOptsOrHandler: string | StorageOptions | ((event: StorageEvent) => any | Promise<any>),
  handler?: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent> {
  return onOperation(metadataUpdatedEvent, bucketOrOptsOrHandler, handler);
}

/** @internal */
export function onOperation(
  eventType: string,
  bucketOrOptsOrHandler: string | StorageOptions | ((event: StorageEvent) => any | Promise<any>),
  handler: (event: StorageEvent) => any | Promise<any>
): CloudFunction<StorageEvent> {
  if (typeof bucketOrOptsOrHandler === "function") {
    handler = bucketOrOptsOrHandler as (event: StorageEvent) => any | Promise<any>;
    bucketOrOptsOrHandler = {};
  }

  const [opts, bucket] = getOptsAndBucket(bucketOrOptsOrHandler);

  const func = (raw: CloudEvent<unknown>) => {
    return wrapTraceContext(handler)(raw as StorageEvent);
  };

  func.run = handler;

  // TypeScript doesn't recognize defineProperty as adding a property and complains
  // that __endpoint doesn't exist. We can either cast to any and lose all type safety
  // or we can just assign a meaningless value before calling defineProperty.
  func.__endpoint = {} as ManifestEndpoint;

  // SDK may attempt to read FIREBASE_CONFIG env var to fetch the default bucket name.
  // To prevent runtime errors when FIREBASE_CONFIG env var is missing, we use getters.
  Object.defineProperty(func, "__endpoint", {
    get: () => {
      const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
      const specificOpts = options.optionsToEndpoint(opts);

      const endpoint: ManifestEndpoint = {
        platform: "gcfv2",
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
        },
        eventTrigger: {
          eventType,
          eventFilters: { bucket },
          retry: false,
        },
      };
      copyIfPresent(endpoint.eventTrigger, opts, "retry", "retry");
      return endpoint;
    },
  });

  return func;
}

/** @internal */
export function getOptsAndBucket(
  bucketOrOpts: string | StorageOptions
): [options.EventHandlerOptions, string] {
  let bucket: string;
  let opts: options.EventHandlerOptions;
  if (typeof bucketOrOpts === "string") {
    bucket = bucketOrOpts;
    opts = {};
  } else {
    bucket = bucketOrOpts.bucket || firebaseConfig()?.storageBucket;
    opts = { ...bucketOrOpts };
    delete (opts as any).bucket;
  }

  if (!bucket) {
    throw new Error(
      "Missing bucket name. If you are unit testing, please provide a bucket name" +
        " by providing bucket name directly in the event handler or by setting process.env.FIREBASE_CONFIG."
    );
  }
  if (!/^[a-z\d][a-z\d\\._-]{1,230}[a-z\d]$/.test(bucket)) {
    throw new Error(`Invalid bucket name ${bucket}`);
  }

  return [opts, bucket];
}
