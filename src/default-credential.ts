import * as request from 'request-promise';

export interface Credential {
  getAccessToken(): PromisesAPlus.Thenable<AccessToken>;
}

export interface AccessToken {
  access_token: string;
  expires_in: number;
}

export default class DefaultCredential implements Credential {
  getAccessToken(): PromisesAPlus.Thenable<AccessToken> {
    return request({
      url: 'http://metadata.google.internal/computeMetadata/v1beta1/instance/service-accounts/default/token',
      json: true,
    }).then((res) => <AccessToken>res);
  }
}
