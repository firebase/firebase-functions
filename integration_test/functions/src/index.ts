import * as admin from "firebase-admin";
import * as v1 from "./v1";
import * as v2 from "./v2";

export { v1, v2 };

admin.initializeApp();
