"use strict";
var _ = require('lodash');
var FirebaseEnv = (function () {
    function FirebaseEnv(env) {
        this._env = env;
    }
    FirebaseEnv.loadPath = function (envPath) {
        var source;
        try {
            source = require(envPath);
        }
        catch (e) {
            source = {};
        }
        return new FirebaseEnv(source);
    };
    FirebaseEnv.prototype.get = function (path, fallback) {
        var segments = path.split('.');
        var cur = this._env;
        for (var i = 0; i < segments.length; i++) {
            if (_.has(cur, segments[i])) {
                cur = cur[segments[i]];
            }
            else {
                if (typeof fallback !== 'undefined') {
                    console.log('Using fallback for "' + path + '" environment value');
                    return fallback;
                }
                throw new Error('Environment value "' + path + '" is not configured.');
            }
        }
        return cur;
    };
    return FirebaseEnv;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FirebaseEnv;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Vudi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUI7SUFHRSxxQkFBWSxHQUFHO1FBQ2IsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7SUFDbEIsQ0FBQztJQUVNLG9CQUFRLEdBQWYsVUFBZ0IsT0FBZTtRQUM3QixJQUFJLE1BQU0sQ0FBQztRQUNYLElBQUksQ0FBQztZQUNILE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUIsQ0FBRTtRQUFBLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDWCxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBRUQseUJBQUcsR0FBSCxVQUFJLElBQWEsRUFBRSxRQUFjO1FBQy9CLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsSUFBSSxHQUFHLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUM1QixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN6QyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekIsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLEVBQUUsQ0FBQyxDQUFDLE9BQU8sUUFBUSxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxHQUFHLHFCQUFxQixDQUFDLENBQUM7b0JBQ25FLE1BQU0sQ0FBQyxRQUFRLENBQUM7Z0JBQ2xCLENBQUM7Z0JBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsc0JBQXNCLENBQUMsQ0FBQztZQUN6RSxDQUFDO1FBQ0gsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDYixDQUFDO0lBQ0gsa0JBQUM7QUFBRCxDQUFDLEFBbENELElBa0NDO0FBbENEOzZCQWtDQyxDQUFBIn0=