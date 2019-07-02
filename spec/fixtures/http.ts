// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as nock from 'nock';

interface AccessToken {
  access_token: string;
  expires_in: number;
}

export function mockCredentialFetch(tokenToReturn: AccessToken): nock.Scope {
  return nock('http://metadata.google.internal')
    .get('/computeMetadata/v1beta1/instance/service-accounts/default/token')
    .reply(200, tokenToReturn);
}

export function mockRCVariableFetch(
  projectId: string,
  varName: string,
  data: any,
  token: string = 'thetoken'
): nock.Scope {
  return nock('https://runtimeconfig.googleapis.com')
    .get(`/v1beta1/projects/${projectId}/configs/firebase/variables/${varName}`)
    .matchHeader('Authorization', `Bearer ${token}`)
    .reply(200, { text: JSON.stringify(data) });
}

export function mockMetaVariableWatch(
  projectId: string,
  data: any,
  token: string = 'thetoken',
  updateTime: string = new Date().toISOString()
): nock.Scope {
  return nock('https://runtimeconfig.googleapis.com')
    .post(
      `/v1beta1/projects/${projectId}/configs/firebase/variables/meta:watch`
    )
    .matchHeader('Authorization', `Bearer ${token}`)
    .reply(200, {
      updateTime,
      state: 'UPDATED',
      text: JSON.stringify(data),
    });
}

export function mockMetaVariableWatchTimeout(
  projectId: string,
  delay: number,
  token?: string
): nock.Scope {
  let interceptor = nock('https://runtimeconfig.googleapis.com').post(
    `/v1beta1/projects/${projectId}/configs/firebase/variables/meta:watch`
  );

  if (interceptor) {
    interceptor = interceptor.matchHeader('Authorization', `Bearer ${token}`);
  }

  return interceptor.delay(delay).reply(502);
}

export function mockCreateToken(
  token: AccessToken = { access_token: 'aToken', expires_in: 3600 }
): nock.Scope {
  return nock('https://accounts.google.com')
    .post('/o/oauth2/token')
    .reply(200, token);
}

export function mockRefreshToken(
  token: AccessToken = { access_token: 'aToken', expires_in: 3600 }
): nock.Scope {
  return nock('https://www.googleapis.com')
    .post('/oauth2/v4/token')
    .reply(200, token);
}

export function mockMetadataServiceToken(
  token: AccessToken = { access_token: 'aToken', expires_in: 3600 }
): nock.Scope {
  return nock('http://metadata.google.internal')
    .get('/computeMetadata/v1beta1/instance/service-accounts/default/token')
    .reply(200, token);
}
