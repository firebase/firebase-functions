"use strict";
var _ = require('lodash');
var FirebaseEnv = (function () {
    function FirebaseEnv(env) {
        this._env = env;
    }
    FirebaseEnv.loadPath = function (envPath) {
        var source;
        try {
            source = require(envPath);
        }
        catch (e) {
            source = {};
        }
        return new FirebaseEnv(source);
    };
    FirebaseEnv.prototype.get = function (path, fallback) {
        var segments = path.split('.');
        var cur = this._env;
        for (var i = 0; i < segments.length; i++) {
            if (_.has(cur, segments[i])) {
                cur = cur[segments[i]];
            }
            else {
                if (typeof fallback !== 'undefined') {
                    console.log('Using fallback for "' + path + '" environment value');
                    return fallback;
                }
                throw new Error('Environment value "' + path + '" is not configured.');
            }
        }
        return cur;
    };
    return FirebaseEnv;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FirebaseEnv;
