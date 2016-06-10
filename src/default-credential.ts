import * as firebase from 'firebase';
import * as rp from 'request-promise';

export default class DefaultCredential implements firebase.Credential {
    getAccessToken(): PromisesAPlus.Thenable<firebase.AccessToken> {
        return rp({
            url: 'http://metadata.google.internal/computeMetadata/v1beta1/instance/service-accounts/default/token',
            json: true
        }).then((res) => <firebase.AccessToken>res);
    }
}