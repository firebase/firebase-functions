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

// The Firebase Functions runtime is currently a bit slow at resolving requires. Make sure we
// kick off the fetch for Credential and RuntimeConfig while it's also fetching other
// dependencies.
import { credential } from 'firebase-admin';
const cred = credential.applicationDefault();
cred.getAccessToken();

// Because env isn't a function we can't actually export all the types correctly.
// TODO(inlined) should we swap to functions.env().foo.bar? That lets us hang types off of functions.env.Foo.Bar
import {env as firebaseEnv} from './env';
firebaseEnv.init(cred);
export let env: firebaseEnv.Data;
firebaseEnv().observe((data) => env = data);

import {apps} from './apps';
apps.init(firebaseEnv());

// Providers:
import * as authProvider from './providers/auth';
import * as databaseProvider from './providers/database';
import * as pubsubProvider from './providers/pubsub';
import * as storageProvider from './providers/storage';
import * as httpsProvider from './providers/https';

export const auth = authProvider;
export const database = databaseProvider;
export const pubsub = pubsubProvider;
export const storage = storageProvider;
export const https = httpsProvider;

// Exported root types:
export {CloudFunction} from './providers/base';
export {Event} from './event';
