import * as firebase from 'firebase';
import * as functions from './index';
import DefaultCredential from './default-credential';

// Note: using an untyped export as a hack to let us define properties, which doesn't work when using multiple named
// exports.
const apps = {
    get noauth(): firebase.App {
        return firebase.initializeApp({
            databaseURL: functions.env.get('firebase.database.url')
        }, '__noauth__');
    },
    get admin(): firebase.App {
        return firebase.initializeApp({
            databaseURL: functions.env.get('firebase.database.url'),
            credential: new DefaultCredential()
        }, '__admin__')
    }
};

export = apps;