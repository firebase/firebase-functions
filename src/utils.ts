/// <reference path="../typings/index.d.ts" />

import * as _ from 'lodash';
import * as firebase from 'firebase';
import DefaultCredential from './default-credential';
import internal from './internal';

export function normalizePath(path: string): string {
  path = path.replace(/\/$/, '');
  if (path.indexOf('/') !== 0) {
    path = '/' + path;
  }
  return path;
}

export function pathParts(path: string): string[] {
  if (!path || path === '' || path === '/') {
    return [];
  }
  return normalizePath(path).substring(1).split('/');
}

export function applyChange(src: any, dest: any) {
  // if not mergeable, don't merge
  if (!_.isPlainObject(dest) || !_.isPlainObject(src)) {
    return dest;
  }

  return pruneNulls(_.merge({}, src, dest));
}

export function pruneNulls(obj: Object) {
  for (let key in obj) {
    if (obj[key] === null) {
      delete obj[key];
    } else if (_.isPlainObject(obj[key])) {
      pruneNulls(obj[key]);
    }
  }
  return obj;
}

export function valAt(source: any, path?: string) {
  if (source === null) {
    return null;
  } else if (typeof source !== 'object') {
    return path ? null : source;
  }

  let parts = pathParts(path);
  if (!parts.length) {
    return source;
  }

  let cur = source;
  let leaf;
  while (parts.length) {
    let key = parts.shift();
    if (cur[key] === null || leaf) {
      return null;
    } else if (typeof cur[key] === 'object') {
      if (parts.length) {
        cur = cur[key];
      } else {
        return cur[key];
      }
    } else {
      leaf = cur[key];
    }
  }
  return leaf;
}

export function tokenToApp(token: string): firebase.App {
  if (!token) {
    return internal.apps.noauth;
  }

  try {
    return firebase.app(token);
  } catch (e) {
    return firebase.initializeApp({
      databaseURL: internal.env.get('firebase.database.url'),
      databaseAuthVariableOverride: tokenToAuthOverrides(token),
      credential: new DefaultCredential()
    }, token);
  }
}

export function tokenToAuthOverrides(token: string): Object {
  if (!token) {
    return {};
  }
  let parts = token.split('.');
  if (!parts[1]) {
    throw new Error('ID token format invalid.');
  }

  let claims = JSON.parse(new Buffer(parts[1], 'base64').toString('utf8'));
  let overrides = {
    uid: claims['sub'],
    token: claims
  };

  // copy over sugared top-level claim keys
  for (let key of ['email', 'email_verified', 'name']) {
    if (_.has(claims, key)) {
      overrides[key] = claims[key];
    }
  }

  // pick a provider for the top-level key
  let identities = _.get(claims, 'firebase.identities');
  if (!identities) {
    overrides['provider'] = 'anonymous';
  } else {
    for (let provider of ['email', 'google.com', 'facebook.com', 'github.com', 'twitter.com']) {
      if (_.has(identities, provider)) {
        overrides['provider'] = provider.replace('.com', '');
      }
    }
  }

  return overrides;
}
