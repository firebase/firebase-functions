/// <reference path="../../typings/index.d.ts" />
/// <reference path="../firebase.d.ts" />
"use strict";
var _ = require('lodash');
var utils_1 = require('../utils');
var internal_1 = require('../internal');
var DatabaseDeltaSnapshot = (function () {
    function DatabaseDeltaSnapshot(eventData) {
        if (eventData) {
            this._path = eventData.path;
            this._authToken = eventData.authToken;
            this._data = eventData.data;
            this._delta = eventData.delta;
            this._newData = utils_1.applyChange(this._data, this._delta);
        }
    }
    Object.defineProperty(DatabaseDeltaSnapshot.prototype, "ref", {
        get: function () {
            if (!this._ref) {
                this._ref = utils_1.tokenToApp(this._authToken).database().ref(this._fullPath());
            }
            return this._ref;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DatabaseDeltaSnapshot.prototype, "adminRef", {
        get: function () {
            if (!this._adminRef) {
                this._adminRef = internal_1.default.apps.admin.database().ref(this._fullPath());
            }
            return this._adminRef;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DatabaseDeltaSnapshot.prototype, "key", {
        get: function () {
            var fullPath = this._fullPath().substring(1).split('/');
            var last = _.last(fullPath);
            return (!last || last === '') ? null : last;
        },
        enumerable: true,
        configurable: true
    });
    DatabaseDeltaSnapshot.prototype.val = function () {
        var parts = utils_1.pathParts(this._childPath);
        var source = this._isPrevious ? this._data : this._newData;
        return _.cloneDeep(parts.length ? _.get(source, parts, null) : source);
    };
    DatabaseDeltaSnapshot.prototype.exists = function () {
        return !_.isNull(this.val());
    };
    DatabaseDeltaSnapshot.prototype.child = function (childPath) {
        if (!childPath) {
            return this;
        }
        return this._dup(this._isPrevious, childPath);
    };
    Object.defineProperty(DatabaseDeltaSnapshot.prototype, "previous", {
        get: function () {
            return this._isPrevious ? this : this._dup(true);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DatabaseDeltaSnapshot.prototype, "current", {
        get: function () {
            return this._isPrevious ? this._dup(false) : this;
        },
        enumerable: true,
        configurable: true
    });
    DatabaseDeltaSnapshot.prototype.changed = function () {
        return utils_1.valAt(this._delta, this._childPath) !== undefined;
    };
    DatabaseDeltaSnapshot.prototype.forEach = function (childAction) {
        var _this = this;
        var val = this.val();
        if (_.isPlainObject(val)) {
            _.keys(val).forEach(function (key) { return childAction(_this.child(key)); });
        }
    };
    DatabaseDeltaSnapshot.prototype.hasChild = function (childPath) {
        return this.child(childPath).exists();
    };
    DatabaseDeltaSnapshot.prototype.hasChildren = function () {
        var val = this.val();
        return _.isPlainObject(val) && _.keys(val).length > 0;
    };
    DatabaseDeltaSnapshot.prototype.numChildren = function () {
        var val = this.val();
        return _.isPlainObject(val) ? Object.keys(val).length : 0;
    };
    DatabaseDeltaSnapshot.prototype._dup = function (previous, childPath) {
        var dup = new DatabaseDeltaSnapshot();
        _a = [this._path, this._authToken, this._data, this._delta, this._childPath, this._newData], dup._path = _a[0], dup._authToken = _a[1], dup._data = _a[2], dup._delta = _a[3], dup._childPath = _a[4], dup._newData = _a[5];
        if (previous) {
            dup._isPrevious = true;
        }
        if (childPath) {
            dup._childPath = dup._childPath || '';
            dup._childPath += utils_1.normalizePath(childPath);
        }
        return dup;
        var _a;
    };
    DatabaseDeltaSnapshot.prototype._fullPath = function () {
        var out = (this._path || '') + (this._childPath || '');
        if (out === '') {
            out = '/';
        }
        return out;
    };
    return DatabaseDeltaSnapshot;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DatabaseDeltaSnapshot;
