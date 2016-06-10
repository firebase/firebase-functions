"use strict";
var rp = require('request-promise');
var DefaultCredential = (function () {
    function DefaultCredential() {
    }
    DefaultCredential.prototype.getAccessToken = function () {
        return rp({
            url: 'http://metadata.google.internal/computeMetadata/v1beta1/instance/service-accounts/default/token',
            json: true
        }).then(function (res) { return res; });
    };
    return DefaultCredential;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DefaultCredential;
