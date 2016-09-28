import Apps from './apps';
import { ApplicationDefaultCredential } from './credential';
import FirebaseFunctions from './functions';
import { RuntimeConfigEnv } from './env';

const credential = new ApplicationDefaultCredential();
const env = new RuntimeConfigEnv(credential, process.env.GCLOUD_PROJECT);
const apps = new Apps(credential, env);

const functionsApi: FirebaseFunctions = new FirebaseFunctions(env, apps);
export = functionsApi;
