/// <reference path="../gcf.d.ts" />
/// <reference path="../../typings/main.d.ts" />
/// <reference path="../trigger.d.ts" />
"use strict";
var event_1 = require('../event');
var delta_snapshot_1 = require('./delta-snapshot');
var utils_1 = require('../utils');
var index_1 = require('../index');
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
                instance: index_1.env().get('firebase.database.url'),
                data: new delta_snapshot_1.default(data),
                params: data.params
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9kYXRhYmFzZS9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLG9DQUFvQztBQUNwQyxnREFBZ0Q7QUFDaEQsd0NBQXdDOztBQUV4QyxzQkFBMEIsVUFBVSxDQUFDLENBQUE7QUFDckMsK0JBQWtDLGtCQUFrQixDQUFDLENBQUE7QUFDckQsc0JBQTRCLFVBQVUsQ0FBQyxDQUFBO0FBQ3ZDLHNCQUFrQixVQUFVLENBQUMsQ0FBQTtBQU03QjtJQUFBO0lBdUNBLENBQUM7SUFsQ0MsbUNBQVMsR0FBVCxVQUFVLEtBQWM7UUFDdEIsTUFBTSxDQUFDO1lBQ0wsT0FBTyxFQUFFLG1CQUFtQjtZQUM1QixLQUFLLEVBQUUsS0FBSyxJQUFJLE9BQU87WUFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLO1NBQ2pCLENBQUM7SUFDSixDQUFDO0lBRUQsOEJBQUksR0FBSixVQUFLLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLElBQUkscUJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELDRCQUFFLEdBQUYsVUFBRyxLQUFhLEVBQUUsT0FBNkQ7UUFDN0UsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDRFQUE0RSxDQUFDLENBQUM7UUFDaEcsQ0FBQztRQUVELElBQUksY0FBYyxHQUFlLFVBQVMsSUFBd0I7WUFDaEUsSUFBSSxLQUFLLEdBQUcsSUFBSSxlQUFhLENBQXdCO2dCQUNuRCxPQUFPLEVBQUUsbUJBQW1CO2dCQUM1QixJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDbkIsUUFBUSxFQUFFLFdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQztnQkFDNUMsSUFBSSxFQUFFLElBQUksd0JBQXFCLENBQUMsSUFBSSxDQUFDO2dCQUNyQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07YUFDcEIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QixDQUFDLENBQUM7UUFFRixjQUFjLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM1QyxNQUFNLENBQUMsY0FBYyxDQUFDO0lBQ3hCLENBQUM7SUFDSCxzQkFBQztBQUFELENBQUMsQUF2Q0QsSUF1Q0M7QUF2Q0Q7aUNBdUNDLENBQUEifQ==