import * as request from 'request-promise';
import * as Promise from 'bluebird';

const TEN_MINUTES = 10 * 60 * 1000;

export interface Credential {
  getAccessToken(): PromiseLike<AccessToken>;
}

export interface AccessToken {
  access_token: string;
  expires_in: number;
}

export default class DefaultCredential implements Credential {
  private _token: AccessToken;
  private _expiresAt: number;

  getAccessToken(): PromiseLike<AccessToken> {
    if (Date.now() + TEN_MINUTES < this._expiresAt) {
      return Promise.resolve(_.assign({}, this._token));
    }

    return request({
      url: 'http://metadata.google.internal/computeMetadata/v1beta1/instance/service-accounts/default/token',
      json: true,
    }).then((res) => {
      this._token = <AccessToken>res;
      this._expiresAt = Date.now() + this._token.expires_in * 1000;
      return _.assign({}, this._token);
    });
  }
}
