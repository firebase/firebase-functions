import * as cloud from './cloud';
import DatabaseBuilder from './database/builder';
import FirebaseEnv from './env';
import * as firebase from 'firebase';
export interface FirebaseFunctions {
    database(): DatabaseBuilder;
    cloud: cloud.CloudBuilders;
    app: firebase.app.App;
    env: FirebaseEnv;
}
declare const functions: FirebaseFunctions;
export default functions;
