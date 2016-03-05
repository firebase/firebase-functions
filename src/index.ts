import FirebaseEnv from './env';
import DatabaseBuilder from './database/builder';
import {resolve} from 'path';

export function database() {
  return new DatabaseBuilder();
}

let _env: FirebaseEnv = FirebaseEnv.loadPath(
  process.env.FIREBASE_ENV_PATH || resolve(__dirname, '../../../env.json')
);
export function env(): FirebaseEnv {
  return _env;
}
