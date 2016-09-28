/////////////////////////////////////////////////////////////////////////////////////
////                               WARNING                                       ////
//// This file is included in the Firebase Functions codebase only temporarily.  ////
//// This class should be loaded from the Firebase server-side SDK once the      ////
//// class is made publicly nameable. Until then it will reflect a different     ////
//// coding style and avoids dependencies on some modules that already exist in  ////
//// firebase-functions.                                                         ////
/////////////////////////////////////////////////////////////////////////////////////

import * as jwt from 'jsonwebtoken';

// Use untyped import syntax for Node built-ins
import fs = require('fs');
import os = require('os');
import path = require('path');
import * as request from 'request-promise';
import * as Promise from 'bluebird';
import * as _ from 'lodash';

const GOOGLE_TOKEN_AUDIENCE = 'https://accounts.google.com/o/oauth2/token';
const GOOGLE_AUTH_TOKEN_URL = 'https://accounts.google.com/o/oauth2/token';

// NOTE: the Google Metadata Service uses HTTP over a vlan
const GOOGLE_METADATA_SERVICE_URL =
  'http://metadata.google.internal/computeMetadata/v1beta1/instance/service-accounts/default/token';

const CONFIG_DIR = (() => {
  // Windows has a dedicated low-rights location for apps at ~/Application Data
  const sys = os.platform();
  if (sys && sys.length >= 3 && sys.substring(0, 3).toLowerCase() === 'win') {
    return process.env.APPDATA;
  }

  // On *nix the gcloud cli creates a . dir.
  return process.env.HOME && path.resolve(process.env.HOME, '.config');
})();

const GCLOUD_CREDENTIAL_SUFFIX = 'gcloud/application_default_credentials.json';
const GCLOUD_CREDENTIAL_PATH = CONFIG_DIR && path.resolve(CONFIG_DIR, GCLOUD_CREDENTIAL_SUFFIX);

const REFRESH_TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token';

const ONE_HOUR_IN_SECONDS = 60 * 60;
const JWT_ALGORITHM = 'RS256';
const AUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/firebase.database',
];

/**
 * A struct containing information needed to authenticate requests to Firebase.
 */
export class AccessToken {
  /* tslint:disable:variable-name */
  public access_token: string;
  public expires_in: number;
  /* tslint:enable:variable-name */
}

function copyAttr(to: Object, from: Object, key: string, alt: string) {
  const tmp = from[key] || from[alt];
  if (typeof tmp !== 'undefined') {
    to[key] = tmp;
  }
}

export class RefreshToken {
  /*
   * Tries to load a RefreshToken from a path. If the path is not present, returns null.
   * Throws if data at the path is invalid.
   */
  public static fromPath(path: string): RefreshToken {
    let jsonString: string;

    try {
      jsonString = fs.readFileSync(path, 'utf8');
    } catch (ignored) {
      // Ignore errors if the file is not present, as this is sometimes an expected condition
      return null;
    }

    try {
      return new RefreshToken(JSON.parse(jsonString));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new Error('Failed to parse refresh token file: ' + error);
    }
  }

  public clientId: string;
  public clientSecret: string;
  public refreshToken: string;
  public type: string;

  constructor(json: Object) {
    copyAttr(this, json, 'clientId', 'client_id');
    copyAttr(this, json, 'clientSecret', 'client_secret');
    copyAttr(this, json, 'refreshToken', 'refresh_token');
    copyAttr(this, json, 'type', 'type');

    if (typeof this.clientId !== 'string' || !this.clientId) {
      throw new Error('Refresh token must contain a "client_id" field');
    } else if (typeof this.clientSecret !== 'string' || !this.clientSecret) {
      throw new Error('Refresh token must contain a "client_secret" field');
    } else if (typeof this.refreshToken !== 'string' || !this.refreshToken) {
      throw new Error('Refresh token must contain a "refresh_token" field');
    } else if (typeof this.type !== 'string' || !this.type) {
      throw new Error('Refresh token must contain a "type" field');
    }
  }
}

/**
 * A struct containing the fields necessary to use service-account JSON credentials.
 */
export class Certificate {
  public static fromPath(path: string): Certificate {
    try {
      return new Certificate(JSON.parse(fs.readFileSync(path, 'utf8')));
    } catch (error) {
      // Throw a nicely formed error message if the file contents cannot be parsed
      throw new Error('Failed to parse service account key file: ' + error);
    }
  }

  public projectId: string;
  public privateKey: string;
  public clientEmail: string;

  constructor(json: Object) {
    copyAttr(this, json, 'projectId', 'project_id');
    copyAttr(this, json, 'privateKey', 'private_key');
    copyAttr(this, json, 'clientEmail', 'client_email');

    if (typeof this.privateKey !== 'string' || !this.privateKey) {
      throw new Error('Service account key must contain a string "private_key" field');
    } else if (typeof this.clientEmail !== 'string' || !this.clientEmail) {
      throw new Error('Service account key must contain a string "client_email" field');
    }
  }
}

/**
 * Interface for things that generate access tokens.
 * Should possibly be moved to a Credential namespace before making public.
 */
export interface Credential {
  getAccessToken(): PromiseLike<AccessToken>;
  getCertificate(): Certificate;
}

/**
 * A wrapper around the http and https request libraries to simplify & promisify JSON requests.
 * TODO(Thomas) create a type for "transit"
 */
function requestAccessToken(options): PromiseLike<AccessToken> {
  options = _.assign({}, options, {json: true});
  return request(options).then(json => {
    if (json.error) {
      let msg = 'Error fetching access token: ' + json.error;
      if (json.error_description) {
        msg += ' (' + json.error_description + ')';
      }
      throw new Error(msg);
    }
    if (!json.access_token || !json.expires_in) {
      throw new Error('Unexpected response from server');
    }
    return <AccessToken>json;
  });
}

/**
 * Implementation of Credential that uses a service account certificate.
 */
export class CertCredential implements Credential {
  private _certificate: Certificate;

  constructor(certificate: Certificate) {
    this._certificate = certificate;
  }

  public getAccessToken(): PromiseLike<AccessToken> {
    return requestAccessToken({
      method: 'POST',
      uri: GOOGLE_AUTH_TOKEN_URL,
      form: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: this.createAuthJwt_(),
      },
    });
  }

  public getCertificate(): Certificate {
    return this._certificate;
  }

  private createAuthJwt_(): string {
    const claims = {
      scope: AUTH_SCOPES.join(' '),
    };

    // This method is actually synchronous so we can capture and return the buffer.
    return jwt.sign(claims, this._certificate.privateKey, {
      audience: GOOGLE_TOKEN_AUDIENCE,
      expiresIn: ONE_HOUR_IN_SECONDS,
      issuer: this._certificate.clientEmail,
      algorithm: JWT_ALGORITHM,
    });
  }
}

/**
 * Noop implementation of Credential.getToken that returns a Promise of null.
 */
export class UnauthenticatedCredential implements Credential {
  public getAccessToken(): PromiseLike<AccessToken> {
    return Promise.resolve(null);
  }

  public getCertificate(): Certificate {
    return null;
  }
}

/**
 * Implementation of Credential that gets access tokens from refresh tokens.
 */
export class RefreshTokenCredential implements Credential {
  private _refreshToken: RefreshToken;

  constructor(refreshToken: RefreshToken) {
    this._refreshToken = refreshToken;
  }

  public getAccessToken(): PromiseLike<AccessToken> {
    return requestAccessToken({
      method: 'POST',
      uri: REFRESH_TOKEN_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      form: {
        client_id: this._refreshToken.clientId,
        client_secret: this._refreshToken.clientSecret,
        refresh_token: this._refreshToken.refreshToken,
        grant_type: 'refresh_token',
      },
    });
  };

  public getCertificate(): Certificate {
    return null;
  }
}

/**
 * Implementation of Credential that gets access tokens from the metadata service available
 * in the Google Cloud Platform. This authenticates the process as the default service account
 * of an App Engine instance or Google Compute Engine machine.
 */
export class MetadataServiceCredential implements Credential {
  public getAccessToken(): PromiseLike<AccessToken> {
    return requestAccessToken({
      method: 'GET',
      uri: GOOGLE_METADATA_SERVICE_URL,
    });
  }

  public getCertificate(): Certificate {
    return null;
  }
}

/**
 * ApplicationDefaultCredential implements the process for loading credentials as
 * described in https://developers.google.com/identity/protocols/application-default-credentials
 */
export class ApplicationDefaultCredential implements Credential {
  private _credential: Credential;

  constructor() {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const serviceAccount = Certificate.fromPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      this._credential = new CertCredential(serviceAccount);
      return;
    }

    // It is OK to not have this file. If it is present, it must be valid.
    const refreshToken = RefreshToken.fromPath(GCLOUD_CREDENTIAL_PATH);
    if (refreshToken) {
      this._credential = new RefreshTokenCredential(refreshToken);
      return;
    }

    this._credential = new MetadataServiceCredential();
  }

  public getAccessToken(): PromiseLike<AccessToken> {
    return this._credential.getAccessToken();
  }

  public getCertificate(): Certificate {
    return this._credential.getCertificate();
  }

  // Used in testing to verify we are delegating to the correct implementation.
  public getCredential(): Credential {
    return this._credential;
  }
}
