import * as nock from 'nock';
import { AccessToken } from '../../src/default-credential';

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
