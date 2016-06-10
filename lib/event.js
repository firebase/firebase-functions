/// <reference path="firebase.d.ts" />
"use strict";
var FirebaseEvent = (function () {
    function FirebaseEvent(options) {
        _a = [options.service, options.type, options.instance, options.uid, options.deviceId, options.data, options.params || {}, options.app], this.service = _a[0], this.type = _a[1], this.instance = _a[2], this.uid = _a[3], this.deviceId = _a[4], this.data = _a[5], this.params = _a[6], this.app = _a[7];
        var _a;
    }
    return FirebaseEvent;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FirebaseEvent;
