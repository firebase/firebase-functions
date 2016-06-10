import FirebaseEnv from './env';
import DatabaseBuilder from './database/builder';
import {resolve} from 'path';
import * as firebase from 'firebase';
import * as apps from './apps';

let env = FirebaseEnv.loadPath(process.env.FIREBASE_ENV_PATH || resolve(__dirname, '../../../env.json'));

// Note: using an untyped export as a hack to let us define properties, which doesn't work when using multiple named
// exports.
const functions = {
  database(): DatabaseBuilder {
    return new DatabaseBuilder();
  },
  get app(): firebase.App {
    return apps.admin;
  },
  get env(): FirebaseEnv {
    return env;
  }
};

export = functions;