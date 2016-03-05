"use strict";
var env_1 = require('./env');
var builder_1 = require('./database/builder');
var path_1 = require('path');
function database() {
    return new builder_1.default();
}
exports.database = database;
var _env = env_1.default.loadPath(process.env.FIREBASE_ENV_PATH || path_1.resolve(__dirname, '../../../env.json'));
function env() {
    return _env;
}
exports.env = env;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLG9CQUF3QixPQUFPLENBQUMsQ0FBQTtBQUNoQyx3QkFBNEIsb0JBQW9CLENBQUMsQ0FBQTtBQUNqRCxxQkFBc0IsTUFBTSxDQUFDLENBQUE7QUFFN0I7SUFDRSxNQUFNLENBQUMsSUFBSSxpQkFBZSxFQUFFLENBQUM7QUFDL0IsQ0FBQztBQUZlLGdCQUFRLFdBRXZCLENBQUE7QUFFRCxJQUFJLElBQUksR0FBZ0IsYUFBVyxDQUFDLFFBQVEsQ0FDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsSUFBSSxjQUFPLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLENBQ3pFLENBQUM7QUFDRjtJQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRmUsV0FBRyxNQUVsQixDQUFBIn0=