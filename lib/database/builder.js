/// <reference path="../gcf.d.ts" />
/// <reference path="../../typings/index.d.ts" />
/// <reference path="../trigger.d.ts" />
"use strict";
var event_1 = require('../event');
var delta_snapshot_1 = require('./delta-snapshot');
var utils_1 = require('../utils');
var internal_1 = require('../internal');
var DatabaseBuilder = (function () {
    function DatabaseBuilder() {
    }
    DatabaseBuilder.prototype._toConfig = function (event) {
        return {
            service: 'firebase.database',
            event: event || 'write',
            path: this._path
        };
    };
    DatabaseBuilder.prototype.path = function (path) {
        this._path = this._path || '';
        this._path += utils_1.normalizePath(path);
        return this;
    };
    DatabaseBuilder.prototype.on = function (event, handler) {
        if (!this._path) {
            throw new Error('Must call .path(pathValue) before .on() for database function definitions.');
        }
        var wrappedHandler = function (data) {
            var event = new event_1.default({
                service: 'firebase.database',
                type: data['event'],
                instance: internal_1.default.env.get('firebase.database.url'),
                data: new delta_snapshot_1.default(data),
                params: data.params,
                authToken: data.authToken
            });
            return handler(event);
        };
        wrappedHandler.__trigger = this._toConfig();
        return wrappedHandler;
    };
    return DatabaseBuilder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DatabaseBuilder;
