"use strict";
var http_builder_1 = require('./http-builder');
var pubsub_builder_1 = require('./pubsub-builder');
var storage_builder_1 = require('./storage-builder');
function http() {
    return new http_builder_1.default();
}
exports.http = http;
;
function pubsub(topic) {
    return new pubsub_builder_1.default(topic);
}
exports.pubsub = pubsub;
function storage(bucket) {
    return new storage_builder_1.default(bucket);
}
exports.storage = storage;
;
