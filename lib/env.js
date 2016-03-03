"use strict";
var path_1 = require("path");
var _ = require("lodash");
var FirebaseEnv = (function () {
    function FirebaseEnv(env) {
        this._env = env;
    }
    FirebaseEnv.loadFromDirectory = function (start) {
        var cur = start;
        var prev;
        var source;
        while (!source && cur !== prev) {
            var envPath = path_1.resolve(cur, "../env.json");
            try {
                source = require(envPath);
            }
            catch (e) {
                prev = cur;
                cur = path_1.dirname(cur);
            }
        }
        return new FirebaseEnv(source || {});
    };
    FirebaseEnv.prototype.get = function (path, fallback) {
        var segments = path.split(".");
        var cur = this._env;
        for (var i = 0; i < segments.length; i++) {
            if (_.has(cur, segments[i])) {
                cur = cur[segments[i]];
            }
            else {
                if (typeof fallback !== "undefined") {
                    console.log("Using fallback for '" + path + "' environment value");
                    return fallback;
                }
                throw new Error("Environment value '" + path + "' is not configured.");
            }
        }
        return cur;
    };
    return FirebaseEnv;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FirebaseEnv;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Vudi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEscUJBQStCLE1BQU0sQ0FBQyxDQUFBO0FBRXRDLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCO0lBR0UscUJBQVksR0FBRztRQUNiLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO0lBQ2xCLENBQUM7SUFFTSw2QkFBaUIsR0FBeEIsVUFBeUIsS0FBYztRQUNyQyxJQUFJLEdBQUcsR0FBVyxLQUFLLENBQUM7UUFDeEIsSUFBSSxJQUFZLENBQUM7UUFDakIsSUFBSSxNQUFjLENBQUM7UUFFbkIsT0FBTyxDQUFDLE1BQU0sSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDL0IsSUFBSSxPQUFPLEdBQUcsY0FBTyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUM7Z0JBQ0gsTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QixDQUFFO1lBQUEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDWCxJQUFJLEdBQUcsR0FBRyxDQUFDO2dCQUNYLEdBQUcsR0FBRyxjQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsQ0FBQztRQUNILENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCx5QkFBRyxHQUFILFVBQUksSUFBYSxFQUFFLFFBQWM7UUFDL0IsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixJQUFJLEdBQUcsR0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQzVCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDNUIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sRUFBRSxDQUFDLENBQUMsT0FBTyxRQUFRLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLEdBQUcscUJBQXFCLENBQUMsQ0FBQztvQkFDbkUsTUFBTSxDQUFDLFFBQVEsQ0FBQztnQkFDbEIsQ0FBQztnQkFDRCxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixHQUFHLElBQUksR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3pFLENBQUM7UUFDSCxDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFDSCxrQkFBQztBQUFELENBQUMsQUF6Q0QsSUF5Q0M7QUF6Q0Q7NkJBeUNDLENBQUEifQ==