import FirebaseEnv from './env';
import * as firebase from 'firebase';
import { AuthMode } from './gcf';
export declare module internal {
    let env: FirebaseEnv;
    class Apps {
        admin_: firebase.app.App;
        noauth_: firebase.app.App;
        readonly admin: firebase.app.App;
        readonly noauth: firebase.app.App;
        forMode(auth: AuthMode): firebase.app.App;
    }
    let apps: Apps;
}
export default internal;
