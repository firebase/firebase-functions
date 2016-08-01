/// <reference path="firebase.d.ts" />
"use strict";
var internal_1 = require('./internal');
var _ = require('lodash');
var FirebaseEvent = (function () {
    function FirebaseEvent(metadata, data) {
        _a = [metadata.service, metadata.type, metadata.instance, metadata.deviceId, data, metadata.params || {}, metadata.auth], this.service = _a[0], this.type = _a[1], this.instance = _a[2], this.deviceId = _a[3], this.data = _a[4], this.params = _a[5], this._auth = _a[6];
        if (_.has(this._auth, 'variable.uid')) {
            this.uid = metadata.auth.variable.uid;
        }
        var _a;
    }
    Object.defineProperty(FirebaseEvent.prototype, "app", {
        get: function () {
            if (!this._app) {
                this._app = internal_1.default.apps.forMode(this._auth);
            }
            return this._app;
        },
        enumerable: true,
        configurable: true
    });
    return FirebaseEvent;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FirebaseEvent;
