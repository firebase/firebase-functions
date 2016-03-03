"use strict";
var env_1 = require('./env');
var builder_1 = require('./database/builder');
function database() {
    return new builder_1.default();
}
exports.database = database;
var _env = env_1.default.loadFromDirectory(__dirname);
function env() {
    return _env;
}
exports.env = env;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG9CQUF3QixPQUFPLENBQUMsQ0FBQTtBQUNoQyx3QkFBNEIsb0JBQW9CLENBQUMsQ0FBQTtBQUVqRDtJQUNFLE1BQU0sQ0FBQyxJQUFJLGlCQUFlLEVBQUUsQ0FBQztBQUMvQixDQUFDO0FBRmUsZ0JBQVEsV0FFdkIsQ0FBQTtBQUVELElBQUksSUFBSSxHQUFnQixhQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakU7SUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUZlLFdBQUcsTUFFbEIsQ0FBQSJ9