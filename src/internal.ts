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
    }

    export let apps = new Apps();
}

export default internal;