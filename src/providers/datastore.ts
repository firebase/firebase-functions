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

import { makeCloudFunction, CloudFunction, Event } from '../cloud-functions';

/** @internal */
export const provider = (new Buffer('Y2xvdWQuZmlyc3RvcmU=', 'base64')).toString();

/** @internal */
export const defaultDatabase = '(default)';

export function database(database: string = defaultDatabase) {
  return new DatabaseBuilder(`projects/${process.env.GCLOUD_PROJECT}/databases/${database}`);
}

export function namespace(namespace: string) {
  return database().namespace(namespace);
}

export function document(path: string) {
  return database().document(path);
}

export class DatabaseBuilder {
  /** @internal */
  constructor(private resource: string) { }

  namespace(namespace: string) {
    return new NamespaceBuilder(`${this.resource}/documents@${namespace}`);
  }

  document(path: string) {
    return (new NamespaceBuilder(`${this.resource}/documents`)).document(path);
  }
}

export class NamespaceBuilder {
  /** @internal */
  constructor(private resource: string) { }

  document(path: string) {
    return new DocumentBuilder(`${this.resource}/${path}`);
  }
}

export class DocumentBuilder {
  /** @internal */
  constructor(private resource: string) {
    // TODO what validation do we want to do here?
  }

  onWrite(handler: (event: Event<any>) => PromiseLike<any> | any): CloudFunction<any> {
    return makeCloudFunction({
      provider, handler,
      resource: this.resource,
      eventType: 'document.write',
    });
  }
}
