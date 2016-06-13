"use strict";
var default_credential_1 = require('./default-credential');
var env_1 = require('./env');
var path_1 = require('path');
var firebase = require('firebase');
var internal;
(function (internal) {
    internal.env = env_1.default.loadPath(process.env.FIREBASE_ENV_PATH || path_1.resolve(__dirname, '../../../env.json'));
    var Apps = (function () {
        function Apps() {
        }
        Object.defineProperty(Apps.prototype, "admin", {
            get: function () {
                this.admin_ = this.admin_ || firebase.initializeApp({
                    databaseURL: internal.env.get('firebase.database.url'),
                    credential: new default_credential_1.default()
                }, '__admin__');
                return this.admin_;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Apps.prototype, "noauth", {
            get: function () {
                this.noauth_ = this.noauth_ || firebase.initializeApp({
                    databaseURL: internal.env.get('firebase.database.url')
                }, '__noauth__');
                return this.noauth_;
            },
            enumerable: true,
            configurable: true
        });
        return Apps;
    }());
    internal.apps = new Apps();
})(internal = exports.internal || (exports.internal = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = internal;
