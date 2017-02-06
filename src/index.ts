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
