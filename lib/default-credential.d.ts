export interface Credential {
    getAccessToken(): PromisesAPlus.Thenable<AccessToken>;
}
export interface AccessToken {
    access_token: string;
    expires_in: number;
}
export default class DefaultCredential implements Credential {
    getAccessToken(): PromisesAPlus.Thenable<AccessToken>;
}
