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
        console.warn('DEPRECATION NOTICE: cloud.storage("bucket").on("change", handler) is deprecated, use cloud.storage("bucket").onChange(handler)');
        return this.onChange(handler);
    };
    CloudStorageBuilder.prototype.onChange = function (handler) {
        handler.__trigger = this._toConfig('change');
        return handler;
    };
    return CloudStorageBuilder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CloudStorageBuilder;
