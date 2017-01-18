// The Firebase Functions runtime is currently a bit slow at resolving requires. Make sure we
// kick off the fetch for Credential and RuntimeConfig while it's also fetching other
// dependencies.
import { credential } from 'firebase-admin';
const cred = credential.applicationDefault();
cred.getAccessToken();

import { RuntimeConfigEnv } from './env';
const env = new RuntimeConfigEnv(cred, process.env.GCLOUD_PROJECT);

import Apps from './apps';
import FirebaseFunctions from './functions';

const apps = new Apps(env);

const functionsApi: FirebaseFunctions = new FirebaseFunctions(env, apps);
export = functionsApi;
