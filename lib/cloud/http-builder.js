"use strict";
var CloudHttpBuilder = (function () {
    function CloudHttpBuilder() {
    }
    CloudHttpBuilder.prototype._toConfig = function (event) {
        return {
            service: 'cloud.http',
            event: event
        };
    };
    CloudHttpBuilder.prototype.on = function (event, handler) {
        if (event !== 'request') {
            throw new Error("Provider cloud.http does not support event type \"" + event + "\"");
        }
        handler.__trigger = this._toConfig(event);
        return handler;
    };
    return CloudHttpBuilder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CloudHttpBuilder;
