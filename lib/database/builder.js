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
        var wrappedHandler = function (context, data) {
            var event = new event_1.default({
                source: 'database',
                type: data['event'],
                instance: index_1.env().get('firebase.database.url'),
                data: new delta_snapshot_1.default(data)
            });
            handler(event).then(function (result) { return context.success(result); }, function (err) { return context.error(err); });
        };
        wrappedHandler.__trigger = this._toConfig();
        return wrappedHandler;
    };
    return DatabaseBuilder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DatabaseBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9kYXRhYmFzZS9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLG9DQUFvQztBQUNwQyxnREFBZ0Q7O0FBRWhELHNCQUEwQixVQUFVLENBQUMsQ0FBQTtBQUNyQywrQkFBa0Msa0JBQWtCLENBQUMsQ0FBQTtBQUNyRCxzQkFBNEIsVUFBVSxDQUFDLENBQUE7QUFDdkMsc0JBQWtCLFVBQVUsQ0FBQyxDQUFBO0FBRTdCO0lBQUE7SUF3Q0EsQ0FBQztJQW5DQyxtQ0FBUyxHQUFULFVBQVUsS0FBYztRQUN0QixNQUFNLENBQUM7WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDaEIsS0FBSyxFQUFFLEtBQUssSUFBSSxPQUFPO1NBQ3hCLENBQUM7SUFDSixDQUFDO0lBRUQsOEJBQUksR0FBSixVQUFLLElBQVk7UUFDZixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxLQUFLLElBQUkscUJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELDRCQUFFLEdBQUYsVUFBRyxLQUFhLEVBQUUsT0FBK0I7UUFDL0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLDRFQUE0RSxDQUFDLENBQUM7UUFDaEcsQ0FBQztRQUVELElBQUksY0FBYyxHQUFlLFVBQVMsT0FBTyxFQUFFLElBQUk7WUFDckQsSUFBSSxLQUFLLEdBQUcsSUFBSSxlQUFhLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxVQUFVO2dCQUNsQixJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDbkIsUUFBUSxFQUFFLFdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQztnQkFDNUMsSUFBSSxFQUFFLElBQUksd0JBQXFCLENBQUMsSUFBSSxDQUFDO2FBQ3RDLENBQUMsQ0FBQztZQUVILE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQ2pCLFVBQUEsTUFBTSxJQUFJLE9BQUEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBdkIsQ0FBdUIsRUFDakMsVUFBQSxHQUFHLElBQUksT0FBQSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFsQixDQUFrQixDQUMxQixDQUFDO1FBQ0osQ0FBQyxDQUFDO1FBRUYsY0FBYyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDNUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBQ0gsc0JBQUM7QUFBRCxDQUFDLEFBeENELElBd0NDO0FBeENEO2lDQXdDQyxDQUFBIn0=