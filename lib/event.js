/// <reference path="firebase.d.ts" />
"use strict";
var internal_1 = require('./internal');
var FirebaseEvent = (function () {
    function FirebaseEvent(options) {
        _a = [options.service, options.type, options.instance, options.deviceId, options.data, options.params || {}, options.auth], this.service = _a[0], this.type = _a[1], this.instance = _a[2], this.deviceId = _a[3], this.data = _a[4], this.params = _a[5], this.auth = _a[6];
        if (typeof options.auth.variable === 'object' && options.auth.variable.hasOwnProperty('uid')) {
            this.uid = options.auth.variable.uid;
        }
        var _a;
    }
    Object.defineProperty(FirebaseEvent.prototype, "app", {
        get: function () {
            if (!this._app) {
                this._app = internal_1.default.apps.forMode(this.auth);
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
