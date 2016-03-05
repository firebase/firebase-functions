/// <reference path="../gcf.d.ts" />
/// <reference path="../../typings/main.d.ts" />
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
            path: this._path,
            event: event || 'write'
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
                source: 'database',
                type: data['event'],
                instance: index_1.env().get('firebase.database.url'),
                data: new delta_snapshot_1.default(data)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9kYXRhYmFzZS9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLG9DQUFvQztBQUNwQyxnREFBZ0Q7O0FBRWhELHNCQUEwQixVQUFVLENBQUMsQ0FBQTtBQUNyQywrQkFBa0Msa0JBQWtCLENBQUMsQ0FBQTtBQUNyRCxzQkFBNEIsVUFBVSxDQUFDLENBQUE7QUFDdkMsc0JBQWtCLFVBQVUsQ0FBQyxDQUFBO0FBRTdCO0lBQUE7SUFxQ0EsQ0FBQztJQWhDQyxtQ0FBUyxHQUFULFVBQVUsS0FBYztRQUN0QixNQUFNLENBQUM7WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDaEIsS0FBSyxFQUFFLEtBQUssSUFBSSxPQUFPO1NBQ3hCLENBQUM7SUFDSixDQUFDO0lBRUQsOEJBQUksR0FBSixVQUFLLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLElBQUkscUJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELDRCQUFFLEdBQUYsVUFBRyxLQUFhLEVBQUUsT0FBK0I7UUFDL0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDRFQUE0RSxDQUFDLENBQUM7UUFDaEcsQ0FBQztRQUVELElBQUksY0FBYyxHQUFlLFVBQVMsSUFBd0I7WUFDaEUsSUFBSSxLQUFLLEdBQUcsSUFBSSxlQUFhLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxVQUFVO2dCQUNsQixJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDbkIsUUFBUSxFQUFFLFdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQztnQkFDNUMsSUFBSSxFQUFFLElBQUksd0JBQXFCLENBQUMsSUFBSSxDQUFDO2FBQ3RDLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEIsQ0FBQyxDQUFDO1FBRUYsY0FBYyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDNUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBQ0gsc0JBQUM7QUFBRCxDQUFDLEFBckNELElBcUNDO0FBckNEO2lDQXFDQyxDQUFBIn0=