// The MIT License (MIT)
//
// Copyright (c) 2015 Firebase
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

import * as _ from 'lodash';

import { apps } from './apps';

/* Incoming event, no uid and _auth */
export interface RawEvent {
  eventId?: string;
  timestamp?: string;
  auth?: apps.AuthMode;
  eventType?: string;
  resource?: string;
  path?: string;
  params?: {[option: string]: any};
  data: any;
}

/* Has all fields of RawEvent except data, used to construct new Events by
   AbstractFunctionBuilder._makeHandler */
export interface EventMetadata {
  eventId?: string;
  timestamp?: string;
  auth?: apps.AuthMode;
  eventType?: string;
  resource?: string;
  path?: string;
  params?: {[option: string]: any};
}

export class Event<T> {
  eventId?: string;
  timestamp?: string;
  auth?: apps.AuthMode;
  eventType?: string;
  resource?: string;
  path?: string;
  params?: {[option: string]: any};
  data: T;
  uid?: string;

  protected _auth?: apps.AuthMode; // we have not yet agreed on what we want to expose here

  constructor(metadata: EventMetadata, data: T) {
    _.assign(this, metadata);
    this.data = data;
    this.params = this.params || {};
    if (_.has(this._auth, 'variable.uid')) {
      this.uid = metadata.auth.variable.uid;
    }
  }
}
