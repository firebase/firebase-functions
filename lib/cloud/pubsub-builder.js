"use strict";
var CloudPubsubBuilder = (function () {
    function CloudPubsubBuilder(topic) {
        this.topic = topic;
    }
    CloudPubsubBuilder.prototype._toConfig = function (event) {
        return {
            service: 'cloud.pubsub',
            event: event,
            topic: this.topic
        };
    };
    CloudPubsubBuilder.prototype.on = function (event, handler) {
        if (event !== 'message') {
            throw new Error("Provider cloud.pubsub does not support event type \"" + event + "\"");
        }
        console.warn('DEPRECATION NOTICE: cloud.pubsub("topic").on("message", handler) is deprecated, use cloud.pubsub("topic").onMessage(handler)');
        return this.onMessage(handler);
    };
    CloudPubsubBuilder.prototype.onMessage = function (handler) {
        handler.__trigger = this._toConfig('message');
        return handler;
    };
    return CloudPubsubBuilder;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CloudPubsubBuilder;
