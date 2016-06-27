"use strict";
var CloudStorageBuilder = (function () {
    function CloudStorageBuilder(bucket) {
        this.bucket = bucket;
    }
    CloudStorageBuilder.prototype._toConfig = function (event) {
        return {
            service: 'cloud.storage',
            bucket: this.bucket,
            event: event
        };
    };
    CloudStorageBuilder.prototype.on = function (event, handler) {
        if (event !== 'change') {
            throw new Error("Provider cloud.storage does not support event type \"" + event + "\"");
        }
        handler.__trigger = this._toConfig(event);
        return handler;
    };
    return CloudStorageBuilder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CloudStorageBuilder;
