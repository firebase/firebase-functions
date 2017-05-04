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

import { Event, CloudFunction, makeCloudFunction } from '../cloud-functions';
import { config } from '../index';

/** @internal */
export const provider = 'cloud.storage';

/**
 * The optional bucket function allows you to choose which buckets' events to handle.
 * This step can be bypassed by calling object() directly, which will use the bucket that
 * the Firebase SDK for Cloud Storage uses.
 */
export function bucket(bucket: string): BucketBuilder {
  if (!/^[a-z\d][a-z\d\\._-]{1,230}[a-z\d]$/.test(bucket)) {
    throw new Error('Invalid bucket name ${bucket}');
  }
  return new BucketBuilder(`projects/_/buckets/${bucket}`);
}

export function object(): ObjectBuilder {
  return bucket(config().firebase.storageBucket).object();
}

export class BucketBuilder {
  /** @internal */
  constructor(private resource) { }

  /** Handle events for objects in this bucket. */
  object() {
    return new ObjectBuilder(this.resource);
  }
}

// A RegExp that matches on a GCS media link that points at a _nested_ object (one that uses a path/with/slashes).
const nestedMediaLinkRE = new RegExp('https://www.googleapis.com/storage/v1/b/([^/]+)/o/(.*)');

export class ObjectBuilder {
  /** @internal */
  constructor(private resource) { }

  /**
   * Handle any change to any object.
   */
  onChange(handler: (event: Event<ObjectMetadata>) => PromiseLike<any> | any): CloudFunction<ObjectMetadata> {
    // This is a temporary shim to fix the 'mediaLink' for nested objects.
    // BUG(37962789): clean this up when backend fix for bug is deployed.
    let correctMediaLink = (event: Event<ObjectMetadata>) => {
      let deconstructedNestedLink = event.data.mediaLink.match(nestedMediaLinkRE);
      if (deconstructedNestedLink != null) {
        // The media link for a nested object uses an illegal URL (using literal slashes instead of "%2F".
        // Fix up the URL.
        let bucketName = deconstructedNestedLink[1];
        let fixedTail = deconstructedNestedLink[2].replace(/\//g, '%2F');  // "/\//g" means "all forward slashes".
        event.data.mediaLink = 'https://www.googleapis.com/storage/v1/b/' + bucketName + '/o/' + fixedTail;
      }
      return handler(event);
    };
    return makeCloudFunction(
      { provider, handler: correctMediaLink, resource: this.resource, eventType: 'object.change' });
  }
}

export interface ObjectMetadata {
  kind: string;
  id: string;
  resourceState: string;
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
  crc32c?: string;
  componentCount?: number;
  customerEncryption?: {
    encryptionAlgorithm?: string,
    keySha256?: string,
  };
}
