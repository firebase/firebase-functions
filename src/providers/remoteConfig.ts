// The MIT License (MIT)
//
// Copyright (c) 2018 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as _ from 'lodash';

import {
  CloudFunction,
  Event,
  EventContext,
  makeCloudFunction,
} from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';

/** @internal */
export const provider = 'google.firebase.remoteconfig';
/** @internal */
export const service = 'firebaseremoteconfig.googleapis.com';

/**
 * Handle all updates (including rollbacks) that affect a Remote Config project.
 * @param handler A function that takes the updated Remote Config template
 * version metadata as an argument.
 */
export function onUpdate(
  handler: (
    version: TemplateVersion,
    context: EventContext
  ) => PromiseLike<any> | any
): CloudFunction<TemplateVersion> {
  return _onUpdateWithOpts(handler, {});
}

/** @internal */
export function _onUpdateWithOpts(
  handler: (
    version: TemplateVersion,
    context: EventContext
  ) => PromiseLike<any> | any,
  opts: DeploymentOptions
): CloudFunction<TemplateVersion> {
  const triggerResource = () => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    return `projects/${process.env.GCLOUD_PROJECT}`;
  };
  return new UpdateBuilder(triggerResource, opts).onUpdate(handler);
}

/** Builder used to create Cloud Functions for Remote Config. */
export class UpdateBuilder {
  /** @internal */
  constructor(
    private triggerResource: () => string,
    private opts: DeploymentOptions
  ) {}

  /**
   * Handle all updates (including rollbacks) that affect a Remote Config
   * project.
   * @param handler A function that takes the updated Remote Config template
   * version metadata as an argument.
   */
  onUpdate(
    handler: (
      version: TemplateVersion,
      context: EventContext
    ) => PromiseLike<any> | any
  ): CloudFunction<TemplateVersion> {
    return makeCloudFunction({
      handler,
      provider,
      service,
      triggerResource: this.triggerResource,
      eventType: 'update',
      opts: this.opts,
    });
  }
}

/**
 * Interface representing a Remote Config template version metadata object that
 * was emitted when the project was updated.
 */
export interface TemplateVersion {
  /** The version number of the updated Remote Config template. */
  versionNumber: number;

  /** When the template was updated in format (ISO8601 timestamp). */
  updateTime: string;

  /** Metadata about the account that performed the update. */
  updateUser: RemoteConfigUser;

  /** A description associated with the particular Remote Config template. */
  description: string;

  /** The origin of the caller. */
  updateOrigin: string;

  /** The type of update action that was performed. */
  updateType: string;

  /**
   * The version number of the Remote Config template that was rolled back to,
   * if the update was a rollback.
   */
  rollbackSource?: number;
}

export interface RemoteConfigUser {
  name?: string;
  email: string;
  imageUrl?: string;
}
