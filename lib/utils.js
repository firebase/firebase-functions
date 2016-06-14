/// <reference path="../typings/index.d.ts" />
"use strict";
var _ = require('lodash');
var firebase = require('firebase');
var default_credential_1 = require('./default-credential');
var internal_1 = require('./internal');
function normalizePath(path) {
    path = path.replace(/\/$/, '');
    if (path.indexOf('/') !== 0) {
        path = '/' + path;
    }
    return path;
}
exports.normalizePath = normalizePath;
function pathParts(path) {
    if (!path || path === '' || path === '/') {
        return [];
    }
    return normalizePath(path).substring(1).split('/');
}
exports.pathParts = pathParts;
function applyChange(src, dest) {
    // if not mergeable, don't merge
    if (!_.isPlainObject(dest) || !_.isPlainObject(src)) {
        return dest;
    }
    return pruneNulls(_.merge({}, src, dest));
}
exports.applyChange = applyChange;
function pruneNulls(obj) {
    for (var key in obj) {
        if (obj[key] === null) {
            delete obj[key];
        }
        else if (_.isPlainObject(obj[key])) {
            pruneNulls(obj[key]);
        }
    }
    return obj;
}
exports.pruneNulls = pruneNulls;
function valAt(source, path) {
    if (source === null) {
        return null;
    }
    else if (typeof source !== 'object') {
        return path ? null : source;
    }
    var parts = pathParts(path);
    if (!parts.length) {
        return source;
    }
    var cur = source;
    var leaf;
    while (parts.length) {
        var key = parts.shift();
        if (cur[key] === null || leaf) {
            return null;
        }
        else if (typeof cur[key] === 'object') {
            if (parts.length) {
                cur = cur[key];
            }
            else {
                return cur[key];
            }
        }
        else {
            leaf = cur[key];
        }
    }
    return leaf;
}
exports.valAt = valAt;
function tokenToApp(token) {
    if (!token) {
        return internal_1.default.apps.noauth;
    }
    try {
        return firebase.app(token);
    }
    catch (e) {
        return firebase.initializeApp({
            databaseURL: internal_1.default.env.get('firebase.database.url'),
            databaseAuthVariableOverride: tokenToAuthOverrides(token),
            credential: new default_credential_1.default()
        }, token);
    }
}
exports.tokenToApp = tokenToApp;
function tokenToAuthOverrides(token) {
    if (!token) {
        return {};
    }
    var parts = token.split('.');
    if (!parts[1]) {
        throw new Error('ID token format invalid.');
    }
    var claims = JSON.parse(new Buffer(parts[1], 'base64').toString('utf8'));
    var overrides = {
        uid: claims['sub'],
        token: claims
    };
    // copy over sugared top-level claim keys
    for (var _i = 0, _a = ['email', 'email_verified', 'name']; _i < _a.length; _i++) {
        var key = _a[_i];
        if (_.has(claims, key)) {
            overrides[key] = claims[key];
        }
    }
    // pick a provider for the top-level key
    var identities = _.get(claims, 'firebase.identities');
    if (!identities) {
        overrides['provider'] = 'anonymous';
    }
    else {
        for (var _b = 0, _c = ['email', 'google.com', 'facebook.com', 'github.com', 'twitter.com']; _b < _c.length; _b++) {
            var provider = _c[_b];
            if (_.has(identities, provider)) {
                overrides['provider'] = provider.replace('.com', '');
            }
        }
    }
    return overrides;
}
exports.tokenToAuthOverrides = tokenToAuthOverrides;
