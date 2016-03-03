/// <reference path="../gcf.d.ts" />
"use strict";
var event_1 = require("../event");
var delta_snapshot_1 = require("./delta-snapshot");
var utils_1 = require("../utils");
var index_1 = require("../index");
var DatabaseBuilder = (function () {
    function DatabaseBuilder() {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9kYXRhYmFzZS9idWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLG9DQUFvQzs7QUFFcEMsc0JBQTBCLFVBQVUsQ0FBQyxDQUFBO0FBQ3JDLCtCQUFrQyxrQkFBa0IsQ0FBQyxDQUFBO0FBQ3JELHNCQUE0QixVQUFVLENBQUMsQ0FBQTtBQUN2QyxzQkFBa0IsVUFBVSxDQUFDLENBQUE7QUFFN0I7SUFBQTtJQWdDQSxDQUFDO0lBM0JDLG1DQUFTLEdBQVQsVUFBVSxLQUFjO1FBQ3RCLE1BQU0sQ0FBQztZQUNMLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSztZQUNoQixLQUFLLEVBQUUsS0FBSyxJQUFJLE9BQU87U0FDeEIsQ0FBQztJQUNKLENBQUM7SUFFRCw4QkFBSSxHQUFKLFVBQUssSUFBWTtRQUNmLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLEtBQUssSUFBSSxxQkFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsNEJBQUUsR0FBRixVQUFHLEtBQWEsRUFBRSxPQUErQjtRQUMvQyxJQUFJLGNBQWMsR0FBZSxVQUFTLE9BQU8sRUFBRSxJQUFJO1lBQ3JELElBQUksS0FBSyxHQUFHLElBQUksZUFBYSxDQUFDO2dCQUM1QixNQUFNLEVBQUUsVUFBVTtnQkFDbEIsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7Z0JBQ25CLFFBQVEsRUFBRSxXQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUM7Z0JBQzVDLElBQUksRUFBRSxJQUFJLHdCQUFxQixDQUFDLElBQUksQ0FBQzthQUN0QyxDQUFDLENBQUM7WUFDSCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQztRQUVGLGNBQWMsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxjQUFjLENBQUM7SUFDeEIsQ0FBQztJQUNILHNCQUFDO0FBQUQsQ0FBQyxBQWhDRCxJQWdDQztBQWhDRDtpQ0FnQ0MsQ0FBQSJ9