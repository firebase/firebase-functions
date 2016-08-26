"use strict";
var event_1 = require('../event');
var delta_snapshot_1 = require('./delta-snapshot');
var utils_1 = require('../utils');
var internal_1 = require('../internal');
var _ = require('lodash');
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
        if (event !== 'write') {
            throw new Error("Provider database does not support event type \"" + event + "\"");
        }
        if (!this._path) {
            throw new Error('Must call .path(pathValue) before .on() for database function definitions.');
        }
        var wrappedHandler = function (payload) {
            // TODO(thomas/bleigh) 'instance' isn't part of the wire protocol. Should it be? It should also probably be
            // resource
            // TODO(thomas) add service to the wire protocol (http://b/30482184)
            var metadata = _.extend({}, payload, {
                service: 'firebase.database',
                instance: internal_1.default.env.get('firebase.database.url')
            });
            var event = new event_1.default(metadata, new delta_snapshot_1.default(payload));
            return handler(event);
        };
        wrappedHandler.__trigger = this._toConfig();
        return wrappedHandler;
    };
    return DatabaseBuilder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DatabaseBuilder;
