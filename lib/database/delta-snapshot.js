/// <reference path="../../typings/main.d.ts" />
"use strict";
var index_1 = require('../index');
var _ = require('lodash');
var utils_1 = require('../utils');
var Firebase = require('firebase');
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
    DatabaseDeltaSnapshot._populateRef = function (path, token, context) {
        var ref = new Firebase(index_1.env().get('firebase.database.url'), context || token).child(path);
        if (token) {
            ref.authWithCustomToken(token, function () { });
        }
        return ref;
    };
    Object.defineProperty(DatabaseDeltaSnapshot.prototype, "ref", {
        get: function () {
            this._ref = this._ref || this._authToken ?
                DatabaseDeltaSnapshot._populateRef(this._fullPath(), this._authToken) :
                DatabaseDeltaSnapshot._populateRef(this._fullPath(), null, '__noauth__');
            return this._ref;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DatabaseDeltaSnapshot.prototype, "adminRef", {
        get: function () {
            this._adminRef = this._adminRef || DatabaseDeltaSnapshot._populateRef(this._fullPath(), index_1.env().get('firebase.database.secret'), '__admin__');
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
    DatabaseDeltaSnapshot.prototype.previous = function () {
        return this._isPrevious ? this : this._dup(true);
    };
    DatabaseDeltaSnapshot.prototype.current = function () {
        return this._isPrevious ? this._dup(false) : this;
    };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsdGEtc25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YWJhc2UvZGVsdGEtc25hcHNob3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsZ0RBQWdEOztBQUVoRCxzQkFBa0IsVUFBVSxDQUFDLENBQUE7QUFDN0IsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsc0JBQTJELFVBQVUsQ0FBQyxDQUFBO0FBQ3RFLElBQVksUUFBUSxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBRXJDO0lBb0JFLCtCQUFZLFNBQThCO1FBQ3hDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDZCxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztZQUM1QixJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUM7WUFDOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxtQkFBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELENBQUM7SUFDSCxDQUFDO0lBaEJjLGtDQUFZLEdBQTNCLFVBQTRCLElBQVksRUFBRSxLQUFjLEVBQUUsT0FBZ0I7UUFDeEUsSUFBSSxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsV0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1YsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxjQUFPLENBQUMsQ0FBQyxDQUFDO1FB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