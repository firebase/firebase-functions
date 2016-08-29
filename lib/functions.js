"use strict";
var cloud = require('./cloud');
var builder_1 = require('./database/builder');
var internal_1 = require('./internal');
var FirebaseFunctions = (function () {
    function FirebaseFunctions() {
        this.cloud = cloud;
    }
    /**
     * Create a builder for a Firebase Realtime Databse function.
     */
    FirebaseFunctions.prototype.database = function () {
        return new builder_1.default();
    };
    Object.defineProperty(FirebaseFunctions.prototype, "app", {
        /**
         * A Firebase App automatically authenticated with a service account
         * when running in a Firebase Function.
         */
        get: function () {
            return internal_1.default.apps.admin;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FirebaseFunctions.prototype, "env", {
        /**
         * Environment variables available within functions.
         */
        get: function () {
            return internal_1.default.env;
        },
        enumerable: true,
        configurable: true
    });
    return FirebaseFunctions;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FirebaseFunctions;
