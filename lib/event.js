/// <reference path="firebase.d.ts" />
"use strict";
var utils_1 = require('./utils');
var FirebaseEvent = (function () {
    function FirebaseEvent(options) {
        _a = [options.service, options.type, options.instance, options.uid, options.deviceId, options.data, options.params || {}, options.authToken], this.service = _a[0], this.type = _a[1], this.instance = _a[2], this.uid = _a[3], this.deviceId = _a[4], this.data = _a[5], this.params = _a[6], this.authToken = _a[7];
        var _a;
    }
    Object.defineProperty(FirebaseEvent.prototype, "app", {
        get: function () {
            if (!this._app) {
                this._app = utils_1.tokenToApp(this.authToken);
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
