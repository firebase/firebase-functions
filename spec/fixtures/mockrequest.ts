import * as jwt from 'jsonwebtoken';
import * as _ from 'lodash';
import * as nock from 'nock';
import * as mocks from '../fixtures/credential/key.json';

// MockRequest mocks an https.Request.
export class MockRequest {
  public method: 'POST' | 'GET' | 'OPTIONS' = 'POST';

  constructor(
    readonly body: any,
    readonly headers: { [name: string]: string }
  ) {
    // This block intentionally left blank.
  }

  public header(name: string): string {
    return this.headers[name.toLowerCase()];
  }
}

// Creates a mock request with the given data and content-type.
export function mockRequest(
  data: any,
  contentType: string = 'application/json',
  context: {
    authorization?: string;
    instanceIdToken?: string;
  } = {}
) {
  const body: any = {};
  if (!_.isUndefined(data)) {
    body.data = data;
  }

  const headers = {
    'content-type': contentType,
    authorization: context.authorization,
    'firebase-instance-id-token': context.instanceIdToken,
    origin: 'example.com',
  };

  return new MockRequest(body, headers);
}

export const expectedResponseHeaders = {
  'Access-Control-Allow-Origin': 'example.com',
  Vary: 'Origin',
};

/**
 * Mocks out the http request used by the firebase-admin SDK to get the key for
 * verifying an id token.
 */
export function mockFetchPublicKeys(): nock.Scope {
  const mockedResponse = { [mocks.key_id]: mocks.public_key };
  const headers = {
    'cache-control': 'public, max-age=1, must-revalidate, no-transform',
  };

  return nock('https://www.googleapis.com:443')
    .get('/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')
    .reply(200, mockedResponse, headers);
}

/**
 * Generates a mocked Firebase ID token.
 */
export function generateIdToken(projectId: string): string {
  const claims = {};
  const options: jwt.SignOptions = {
    audience: projectId,
    expiresIn: 60 * 60, // 1 hour in seconds
    issuer: 'https://securetoken.google.com/' + projectId,
    subject: mocks.user_id,
    algorithm: 'RS256',
    header: {
      kid: mocks.key_id,
    },
  };
  return jwt.sign(claims, mocks.private_key, options);
}
