// The Firebase Functions runtime is currently a bit slow at resolving requires. Make sure we
// kick off the fetch for Credential and RuntimeConfig while it's also fetching other
// dependencies.
import { credential } from 'firebase-admin';
const cred = credential.applicationDefault();
cred.getAccessToken();

import { RuntimeConfigEnv } from './env';
const env = new RuntimeConfigEnv(cred, process.env.GCLOUD_PROJECT);

// Because env isn't a function we can't actually export all the types correctly.
// TODO(inlined) should we swap to functions.env().foo.bar? That lets us hang types off of functions.env.Foo.Bar
import {env as firebaseEnv} from './env';
firebaseEnv.init(credential);
export let env: firebaseEnv.Data;
firebaseEnv().observe((data) => env = data);

import {apps} from './apps';
apps.init(firebaseEnv());
export let app = apps().admin;

// Providers:
export {auth} from './providers/auth';
export {database} from './providers/database';
export {pubsub} from './providers/pubsub';
export {storage} from './providers/storage';
export {https} from './providers/https'

// Exported root types:
export {CloudFunction} from './providers/base';
export {Event} from './event';
