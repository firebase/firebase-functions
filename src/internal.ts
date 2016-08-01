import DefaultCredential from './default-credential';
import FirebaseEnv from './env'
import {resolve} from 'path';
import * as firebase from 'firebase';

export module internal {
    export let env = FirebaseEnv.loadPath(process.env.FIREBASE_ENV_PATH || resolve(__dirname, '../../../env.json'));

    class Apps {
        admin_: firebase.App;
        noauth_: firebase.App;
        get admin(): firebase.App {
            this.admin_ = this.admin_ || firebase.initializeApp({
                    databaseURL: env.get('firebase.database.url'),
                    credential: new DefaultCredential()
                }, '__admin__');
            return this.admin_;
        }
        get noauth(): firebase.App {
            this.noauth_ = this.noauth_ || firebase.initializeApp({
                    databaseURL: env.get('firebase.database.url')
                }, '__noauth__');
            return this.noauth_;
        }
        forMode(auth: AuthMode): firebase.App {
            if (typeof auth !== 'object') {
                return this.noauth;
            }
            if (auth.admin) {
                return this.admin;
            }
            if (!auth.variable) {
                return this.noauth;
            }

            const key = JSON.stringify(auth.variable);
            try {
                return firebase.app(key);
            } catch (e) {
                return firebase.initializeApp({
                    databaseURL: internal.env.get('firebase.database.url'),
                    databaseAuthVariableOverride: auth.variable,
                    credential: new DefaultCredential()
                }, key);
            }
        }
    }

    export let apps = new Apps();
}

export default internal;