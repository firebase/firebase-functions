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

import * as firestore from "firebase-admin/firestore";

import { posix } from "path";
import { Change } from "../../common/change";
import { ParamsOf } from "../../common/params";
import {
  createBeforeSnapshotFromJson,
  createSnapshotFromJson,
} from "../../common/providers/firestore";
import { CloudFunction, Event, EventContext, makeCloudFunction } from "../cloud-functions";
import { DeploymentOptions } from "../function-configuration";

/** @internal */
export const provider = "google.firestore";
/** @internal */
export const service = "firestore.googleapis.com";
/** @internal */
export const defaultDatabase = "(default)";

export type DocumentSnapshot = firestore.DocumentSnapshot;
export type QueryDocumentSnapshot = firestore.QueryDocumentSnapshot;

/**
 * Select the Firestore document to listen to for events.
 * @param path Full database path to listen to. This includes the name of
 * the collection that the document is a part of. For example, if the
 * collection is named "users" and the document is named "Ada", then the
 * path is "/users/Ada".
 */
export function document<Path extends string>(path: Path) {
  return _documentWithOptions(path, {});
}

// Multiple namespaces are not yet supported by Firestore.
export function namespace(namespace: string) {
  return _namespaceWithOptions(namespace, {});
}

// Multiple databases are not yet supported by Firestore.
export function database(database: string) {
  return _databaseWithOptions(database, {});
}

/** @internal */
export function _databaseWithOptions(
  database: string = defaultDatabase,
  options: DeploymentOptions
) {
  return new DatabaseBuilder(database, options);
}

/** @internal */
export function _namespaceWithOptions(namespace: string, options: DeploymentOptions) {
  return _databaseWithOptions(defaultDatabase, options).namespace(namespace);
}

/** @internal */
export function _documentWithOptions<Path extends string>(path: Path, options: DeploymentOptions) {
  return _databaseWithOptions(defaultDatabase, options).document(path);
}

export class DatabaseBuilder {
  constructor(private database: string, private options: DeploymentOptions) {}

  namespace(namespace: string) {
    return new NamespaceBuilder(this.database, this.options, namespace);
  }

  document<Path extends string>(path: Path) {
    return new NamespaceBuilder(this.database, this.options).document(path);
  }
}

export class NamespaceBuilder {
  constructor(
    private database: string,
    private options: DeploymentOptions,
    private namespace?: string
  ) {}

  document<Path extends string>(path: Path) {
    return new DocumentBuilder<Path>(() => {
      if (!process.env.GCLOUD_PROJECT) {
        throw new Error("process.env.GCLOUD_PROJECT is not set.");
      }
      const database = posix.join(
        "projects",
        process.env.GCLOUD_PROJECT,
        "databases",
        this.database
      );
      return posix.join(
        database,
        this.namespace ? `documents@${this.namespace}` : "documents",
        path
      );
    }, this.options);
  }
}

export function snapshotConstructor(event: Event): DocumentSnapshot {
  return createSnapshotFromJson(
    event.data,
    event.context.resource.name,
    event?.data?.value?.readTime,
    event?.data?.value?.updateTime
  );
}

// TODO remove this function when wire format changes to new format
export function beforeSnapshotConstructor(event: Event): DocumentSnapshot {
  return createBeforeSnapshotFromJson(
    event.data,
    event.context.resource.name,
    event?.data?.oldValue?.readTime,
    undefined
  );
}

function changeConstructor(raw: Event) {
  return Change.fromObjects(beforeSnapshotConstructor(raw), snapshotConstructor(raw));
}

export class DocumentBuilder<Path extends string> {
  constructor(private triggerResource: () => string, private options: DeploymentOptions) {
    // TODO what validation do we want to do here?
  }

  /** Respond to all document writes (creates, updates, or deletes). */
  onWrite(
    handler: (
      change: Change<DocumentSnapshot>,
      context: EventContext<ParamsOf<Path>>
    ) => PromiseLike<any> | any
  ): CloudFunction<Change<DocumentSnapshot>> {
    return this.onOperation(handler, "document.write", changeConstructor);
  }

  /** Respond only to document updates. */
  onUpdate(
    handler: (
      change: Change<QueryDocumentSnapshot>,
      context: EventContext<ParamsOf<Path>>
    ) => PromiseLike<any> | any
  ): CloudFunction<Change<QueryDocumentSnapshot>> {
    return this.onOperation(handler, "document.update", changeConstructor);
  }

  /** Respond only to document creations. */
  onCreate(
    handler: (
      snapshot: QueryDocumentSnapshot,
      context: EventContext<ParamsOf<Path>>
    ) => PromiseLike<any> | any
  ): CloudFunction<QueryDocumentSnapshot> {
    return this.onOperation(handler, "document.create", snapshotConstructor);
  }

  /** Respond only to document deletions. */
  onDelete(
    handler: (
      snapshot: QueryDocumentSnapshot,
      context: EventContext<ParamsOf<Path>>
    ) => PromiseLike<any> | any
  ): CloudFunction<QueryDocumentSnapshot> {
    return this.onOperation(handler, "document.delete", beforeSnapshotConstructor);
  }

  private onOperation<T>(
    handler: (data: T, context: EventContext<ParamsOf<Path>>) => PromiseLike<any> | any,
    eventType: string,
    dataConstructor: (raw: Event) => any
  ): CloudFunction<T> {
    return makeCloudFunction({
      handler,
      provider: provider,
      eventType,
      service: service,
      triggerResource: this.triggerResource,
      legacyEventType: `providers/cloud.firestore/eventTypes/${eventType}`,
      dataConstructor,
      options: this.options,
    });
  }
}
