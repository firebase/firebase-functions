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
  EventContext,
  makeCloudFunction,
} from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';

/** @hidden */
export const provider = 'google.firebase.remoteconfig';
/** @hidden */
export const service = 'firebaseremoteconfig.googleapis.com';

/**
 * Registers a function that triggers on Firebase Remote Config template
 * update events.
 *
 * @param handler A function that takes the updated Remote Config
 *   template version metadata as an argument.
 *
 * @return A Cloud Function that you can export and deploy.
 */
export function onUpdate(
  handler: (
    version: TemplateVersion,
    context: EventContext
  ) => PromiseLike<any> | any
): CloudFunction<TemplateVersion> {
  return _onUpdateWithOptions(handler, {});
}

/** @hidden */
export function _onUpdateWithOptions(
  handler: (
    version: TemplateVersion,
    context: EventContext
  ) => PromiseLike<any> | any,
  options: DeploymentOptions
): CloudFunction<TemplateVersion> {
  const triggerResource = () => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    return `projects/${process.env.GCLOUD_PROJECT}`;
  };
  return new UpdateBuilder(triggerResource, options).onUpdate(handler);
}

/** Builder used to create Cloud Functions for Remote Config. */
export class UpdateBuilder {
  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
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
      options: this.options,
    });
  }
}

/**
 * An interface representing a Remote Config template version metadata object
 * emitted when a project is updated.
 */
export interface TemplateVersion {
  /** The version number of the updated Remote Config template. */
  versionNumber: number;

  /** When the template was updated in format (ISO8601 timestamp). */
  updateTime: string;

  /**
   * Metadata about the account that performed the update, of
   * type [`RemoteConfigUser`](/docs/reference/remote-config/rest/v1/Version#remoteconfiguser).
   */
  updateUser: RemoteConfigUser;

  /** A description associated with this Remote Config template version. */
  description: string;

  /**
   * The origin of the caller - either the Firebase console or the Remote Config
   * REST API. See [`RemoteConfigUpdateOrigin`](/docs/reference/remote-config/rest/v1/Version#remoteconfigupdateorigin)
   * for valid values.
   */
  updateOrigin: string;

  /**
   * The type of update action that was performed, whether forced,
   * incremental, or a rollback operation. See
   * [`RemoteConfigUpdateType`](/docs/reference/remote-config/rest/v1/Version#remoteconfigupdatetype)
   * for valid values.
   */
  updateType: string;

  /**
   * The version number of the Remote Config template that this update rolled back to.
   * Only applies if this update was a rollback.
   */
  rollbackSource?: number;
}

/**
 * An interface representing metadata for a Remote Config account
 * that performed the update. Contains the same fields as
 * [`RemoteConfigUser`](/docs/reference/remote-config/rest/v1/Version#remoteconfiguser).
 */
export interface RemoteConfigUser {
  /** Name of the Remote Config account that performed the update. */
  name?: string;

  /** Email address of the Remote Config account that performed the update. */
  email: string;

  /** Image URL of the Remote Config account that performed the update. */
  imageUrl?: string;
}
