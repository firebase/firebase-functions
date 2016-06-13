"use strict";
var builder_1 = require('./database/builder');
var internal_1 = require('./internal');
var functions = {
    database: function () {
        return new builder_1.default();
    }
};
Object.defineProperty(functions, 'app', {
    enumerable: true,
    get: function () { return internal_1.default.apps.admin; }
});
Object.defineProperty(functions, 'env', {
    enumerable: true,
    get: function () { return internal_1.default.env; }
});
module.exports = functions;
