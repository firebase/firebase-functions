/// <reference path="../gcf.d.ts" />
"use strict";
var event_1 = require("../event");
var delta_snapshot_1 = require("./delta-snapshot");
var utils_1 = require("../utils");
var index_1 = require("../index");
var DatabaseBuilder = (function () {
    function DatabaseBuilder(instance) {
        this._instance = instance;
    }
    DatabaseBuilder.prototype._toConfig = function (event) {
        return {
            path: this._path,
            event: event || "write"
        };
    };
    DatabaseBuilder.prototype.path = function (path) {
        this._path = this._path || "";
        this._path += utils_1.normalizePath(path);
        return this;
    };
    DatabaseBuilder.prototype.on = function (event, handler) {
        var wrappedHandler = function (context, data) {
            var event = new event_1.default({
                source: "database",
                type: data["event"],
                instance: index_1.env().get("firebase.database.url"),
                data: new delta_snapshot_1.default(data)
            });
            handler(event).then(context.success, context.error);
        };
        wrappedHandler.__trigger = this._toConfig();
        return wrappedHandler;
    };
    return DatabaseBuilder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DatabaseBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9kYXRhYmFzZS9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLG9DQUFvQzs7QUFFcEMsc0JBQTBCLFVBQVUsQ0FBQyxDQUFBO0FBQ3JDLCtCQUFrQyxrQkFBa0IsQ0FBQyxDQUFBO0FBQ3JELHNCQUE0QixVQUFVLENBQUMsQ0FBQTtBQUN2QyxzQkFBa0IsVUFBVSxDQUFDLENBQUE7QUFFN0I7SUFhRSx5QkFBWSxRQUFpQjtRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztJQUM1QixDQUFDO0lBVEQsbUNBQVMsR0FBVCxVQUFVLEtBQWM7UUFDdEIsTUFBTSxDQUFDO1lBQ0wsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2hCLEtBQUssRUFBRSxLQUFLLElBQUksT0FBTztTQUN4QixDQUFDO0lBQ0osQ0FBQztJQU1ELDhCQUFJLEdBQUosVUFBSyxJQUFZO1FBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsS0FBSyxJQUFJLHFCQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCw0QkFBRSxHQUFGLFVBQUcsS0FBYSxFQUFFLE9BQStCO1FBQy9DLElBQUksY0FBYyxHQUFlLFVBQVMsT0FBTyxFQUFFLElBQUk7WUFDckQsSUFBSSxLQUFLLEdBQUcsSUFBSSxlQUFhLENBQUM7Z0JBQzVCLE1BQU0sRUFBRSxVQUFVO2dCQUNsQixJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDbkIsUUFBUSxFQUFFLFdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQztnQkFDNUMsSUFBSSxFQUFFLElBQUksd0JBQXFCLENBQUMsSUFBSSxDQUFDO2FBQ3RDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDO1FBRUYsY0FBYyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDNUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztJQUN4QixDQUFDO0lBQ0gsc0JBQUM7QUFBRCxDQUFDLEFBckNELElBcUNDO0FBckNEO2lDQXFDQyxDQUFBIn0=