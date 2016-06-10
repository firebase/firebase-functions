"use strict";
var env_1 = require('./env');
var builder_1 = require('./database/builder');
var path_1 = require('path');
var apps = require('./apps');
var env = env_1.default.loadPath(process.env.FIREBASE_ENV_PATH || path_1.resolve(__dirname, '../../../env.json'));
// Note: using an untyped export as a hack to let us define properties, which doesn't work when using multiple named
// exports.
var functions = {
    database: function () {
        return new builder_1.default();
    },
    get app() {
        return apps.admin;
    },
    get env() {
        return env;
    }
};
module.exports = functions;
