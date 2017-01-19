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
  let mock: nock.Scope = nock('https://runtimeconfig.googleapis.com')
    .get(`/v1beta1/projects/${projectId}/configs/firebase/variables/${varName}`);

  if (token) {
    mock = mock.matchHeader('Authorization', `Bearer ${token}`);
  }

  return mock.reply(200, {text: JSON.stringify(data)});
}

export function mockMetaVariableWatch(
  projectId: string,
  data: any,
  token: string = 'thetoken',
  updateTime: string = new Date().toISOString()
): nock.Scope {
  let mock: nock.Scope = nock('https://runtimeconfig.googleapis.com')
    .post(`/v1beta1/projects/${projectId}/configs/firebase/variables/meta:watch`);

  if (token) {
    mock = mock.matchHeader('Authorization', `Bearer ${token}`);
  }

  return mock.reply(200, {
    updateTime,
    state: 'UPDATED',
    text: JSON.stringify(data),
  });
}

export function mockMetaVariableWatchTimeout(projectId: string, delay: number, token?: string): nock.Scope {
  let mock: nock.Scope = nock('https://runtimeconfig.googleapis.com')
    .post(`/v1beta1/projects/${projectId}/configs/firebase/variables/meta:watch`);

  if (token) {
    mock = mock.matchHeader('Authorization', `Bearer ${token}`);
  }

  return mock.delay(delay).reply(502);
}

export function mockCreateToken(token: AccessToken = {access_token: 'aToken', expires_in: 3600}): nock.Scope {
  let mock: nock.Scope = nock('https://accounts.google.com').post('/o/oauth2/token');
  return mock.reply(200, token);
}

export function mockRefreshToken(token: AccessToken = {access_token: 'aToken', expires_in: 3600}): nock.Scope {
  let mock: nock.Scope = nock('https://www.googleapis.com').post('/oauth2/v4/token');
  return mock.reply(200, token);
}

export function mockMetadataServiceToken(token: AccessToken = {access_token: 'aToken', expires_in: 3600}): nock.Scope {
  let mock: nock.Scope = nock('http://metadata.google.internal')
    .get('/computeMetadata/v1beta1/instance/service-accounts/default/token');
  return mock.reply(200, token);
}
