"use strict";
var firebase = require('firebase');
var default_credential_1 = require('./default-credential');
var apps;
(function (apps) {
    function noauth() {
        return firebase.initializeApp({
            databaseURL: functions.env.get('firebase.database.url')
        }, '__noauth__');
    }
    apps.noauth = noauth;
    function admin() {
        return firebase.initializeApp({
            databaseURL: functions.env.get('firebase.database.url'),
            credential: new default_credential_1.default()
        }, '__admin__');
    }
    apps.admin = admin;
})(apps = exports.apps || (exports.apps = {}));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = apps;
