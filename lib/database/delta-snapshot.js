/// <reference path="../../typings/main.d.ts" />
"use strict";
var index_1 = require("../index");
var _ = require("lodash");
var utils_1 = require("../utils");
var DatabaseDeltaSnapshot = (function () {
    function DatabaseDeltaSnapshot(eventData) {
        if (eventData) {
            this._path = eventData.path;
            this._authToken = eventData.authToken;
            this._oldData = eventData.oldData;
            this._change = eventData.change;
            this._newData = utils_1.applyChange(this._oldData, this._change);
        }
    }
    DatabaseDeltaSnapshot._populateRef = function (path, token, context) {
        var ref = new Firebase(index_1.env().get("firebase.database.url"), context || token).child(path);
        if (token) {
            ref.authWithCustomToken(token, function () { });
        }
        return ref;
    };
    DatabaseDeltaSnapshot.prototype.ref = function () {
        this._ref = this._ref || this._authToken ?
            DatabaseDeltaSnapshot._populateRef(this._fullPath(), this._authToken) :
            DatabaseDeltaSnapshot._populateRef(this._fullPath(), null, "__noauth__");
        return this._ref;
    };
    DatabaseDeltaSnapshot.prototype.adminRef = function () {
        this._adminRef = this._adminRef || DatabaseDeltaSnapshot._populateRef(this._fullPath(), index_1.env().get("firebase.database.secret"), "__admin__");
        return this._adminRef;
    };
    DatabaseDeltaSnapshot.prototype.val = function () {
        var parts = utils_1.pathParts(this._childPath);
        var source = this._isPrior ? this._oldData : this._newData;
        return _.cloneDeep(parts.length ? _.get(source, parts, null) : source);
    };
    DatabaseDeltaSnapshot.prototype.exists = function () {
        return !_.isNull(this.val());
    };
    DatabaseDeltaSnapshot.prototype.child = function (childPath) {
        if (!childPath) {
            return this;
        }
        return this._dup(this._isPrior, childPath);
    };
    DatabaseDeltaSnapshot.prototype.prior = function () {
        return this._isPrior ? this : this._dup(true);
    };
    DatabaseDeltaSnapshot.prototype.changed = function () {
        return utils_1.valAt(this._change, this._childPath) !== undefined;
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
    DatabaseDeltaSnapshot.prototype.key = function () {
        var fullPath = this._fullPath();
        return _.last(fullPath) || null;
    };
    DatabaseDeltaSnapshot.prototype.name = function () {
        return this.key();
    };
    DatabaseDeltaSnapshot.prototype.numChildren = function () {
        var val = this.val();
        return _.isPlainObject(val) ? Object.keys(val).length : 0;
    };
    DatabaseDeltaSnapshot.prototype._dup = function (prior, childPath) {
        var dup = new DatabaseDeltaSnapshot();
        _a = [this._path, this._authToken, this._oldData, this._change, this._childPath, this._newData], dup._path = _a[0], dup._authToken = _a[1], dup._oldData = _a[2], dup._change = _a[3], dup._childPath = _a[4], dup._newData = _a[5];
        if (prior) {
            dup._isPrior = true;
        }
        if (childPath) {
            dup._childPath = dup._childPath || "";
            dup._childPath += utils_1.normalizePath(childPath);
        }
        return dup;
        var _a;
    };
    DatabaseDeltaSnapshot.prototype._fullPath = function () {
        return this._path + (this._childPath || "");
    };
    return DatabaseDeltaSnapshot;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DatabaseDeltaSnapshot;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVsdGEtc25hcHNob3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZGF0YWJhc2UvZGVsdGEtc25hcHNob3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsZ0RBQWdEOztBQUVoRCxzQkFBa0IsVUFBVSxDQUFDLENBQUE7QUFDN0IsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFDNUIsc0JBQTJELFVBQVUsQ0FBQyxDQUFBO0FBRXRFO0lBb0JFLCtCQUFZLFNBQThCO1FBQ3hDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDZCxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQztZQUNsQyxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxtQkFBVyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDSCxDQUFDO0lBaEJjLGtDQUFZLEdBQTNCLFVBQTRCLElBQVksRUFBRSxLQUFjLEVBQUUsT0FBZ0I7UUFDeEUsSUFBSSxHQUFHLEdBQUcsSUFBSSxRQUFRLENBQUMsV0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6RixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1YsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxjQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQVlELG1DQUFHLEdBQUg7UUFDRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVU7WUFDdEMscUJBQXFCLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3JFLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ25CLENBQUM7SUFFRCx3Q0FBUSxHQUFSO1FBQ0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLHFCQUFxQixDQUFDLFlBQVksQ0FDbkUsSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLFdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLFdBQVcsQ0FDckUsQ0FBQztRQUNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxtQ0FBRyxHQUFIO1FBQ0UsSUFBSSxLQUFLLEdBQUcsaUJBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkMsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDM0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELHNDQUFNLEdBQU47UUFDRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFRCxxQ0FBSyxHQUFMLFVBQU0sU0FBa0I7UUFDdEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxxQ0FBSyxHQUFMO1FBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVELHVDQUFPLEdBQVA7UUFDRSxNQUFNLENBQUMsYUFBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLFNBQVMsQ0FBQztJQUM1RCxDQUFDO0lBRUQsdUNBQU8sR0FBUCxVQUFRLFdBQXFCO1FBQTdCLGlCQUtDO1FBSkMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRyxJQUFJLE9BQUEsV0FBVyxDQUFDLEtBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBNUIsQ0FBNEIsQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDSCxDQUFDO0lBRUQsd0NBQVEsR0FBUixVQUFTLFNBQWlCO1FBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3hDLENBQUM7SUFFRCwyQ0FBVyxHQUFYO1FBQ0UsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRUQsbUNBQUcsR0FBSDtRQUNFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNoQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDbEMsQ0FBQztJQUVELG9DQUFJLEdBQUo7UUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCwyQ0FBVyxHQUFYO1FBQ0UsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRU8sb0NBQUksR0FBWixVQUFhLEtBQWMsRUFBRSxTQUFrQjtRQUM3QyxJQUFJLEdBQUcsR0FBRyxJQUFJLHFCQUFxQixFQUFFLENBQUM7UUFDdEMsK0ZBQzRGLEVBRDNGLGlCQUFTLEVBQUUsc0JBQWMsRUFBRSxvQkFBWSxFQUFFLG1CQUFXLEVBQUUsc0JBQWMsRUFBRSxvQkFBWSxDQUNVO1FBRTdGLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDVixHQUFHLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUN0QixDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNkLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUM7WUFDdEMsR0FBRyxDQUFDLFVBQVUsSUFBSSxxQkFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDOztJQUNiLENBQUM7SUFFTyx5Q0FBUyxHQUFqQjtRQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBQ0gsNEJBQUM7QUFBRCxDQUFDLEFBdkhELElBdUhDO0FBdkhEO3VDQXVIQyxDQUFBIn0=