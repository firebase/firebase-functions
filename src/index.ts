import Apps from './apps';
import DefaultCredential from './default-credential';
import FirebaseFunctions from './functions';
import { RuntimeConfigEnv } from './env';

const env = new RuntimeConfigEnv(new DefaultCredential(), process.env.GCLOUD_PROJECT);
const apps = new Apps(env);

const functionsApi: FirebaseFunctions = new FirebaseFunctions(env, apps);
export = functionsApi;
