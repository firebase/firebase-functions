import * as cloud from './cloud';
import DatabaseBuilder from './database/builder';
import FirebaseEnv from './env';
import * as firebase from 'firebase';
export default class FirebaseFunctions {
    /**
     * Namespace for Google Cloud Platform function builders.
     */
    cloud: cloud.CloudBuilders;
    constructor();
    /**
     * Create a builder for a Firebase Realtime Databse function.
     */
    database(): DatabaseBuilder;
    /**
     * A Firebase App automatically authenticated with a service account
     * when running in a Firebase Function.
     */
    readonly app: firebase.app.App;
    /**
     * Environment variables available within functions.
     */
    readonly env: FirebaseEnv;
}
