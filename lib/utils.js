"use strict";
var _ = require('lodash');
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
