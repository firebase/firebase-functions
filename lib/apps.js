"use strict";
var firebase = require('firebase');
var functions = require('./index');
var default_credential_1 = require('./default-credential');
// Note: using an untyped export as a hack to let us define properties, which doesn't work when using multiple named
// exports.
var apps = {
    get noauth() {
        return firebase.initializeApp({
            databaseURL: functions.env.get('firebase.database.url')
        }, '__noauth__');
    },
    get admin() {
        return firebase.initializeApp({
            databaseURL: functions.env.get('firebase.database.url'),
            credential: new default_credential_1.default()
        }, '__admin__');
    }
};
module.exports = apps;
