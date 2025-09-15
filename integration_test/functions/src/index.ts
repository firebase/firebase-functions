import * as admin from "firebase-admin";

// Conditional imports based on AUTH_TEST_MODE environment variable
// This allows us to test auth blocking functions separately to avoid conflicts
const authMode = process.env.AUTH_TEST_MODE || "v1_auth"; // Options: v1_auth, v2_identity, none

let v1: any;
let v2: any;

if (authMode === "v1_auth") {
  // Test v1 with auth blocking functions, v2 without identity
  v1 = require("./v1/index-with-auth");
  v2 = require("./v2/index-without-identity");
} else if (authMode === "v2_identity") {
  // Test v2 with identity blocking functions, v1 without auth
  v1 = require("./v1/index-without-auth");
  v2 = require("./v2/index-with-identity");
} else {
  // Default: no blocking functions (for general testing)
  v1 = require("./v1/index-without-auth");
  v2 = require("./v2/index-without-identity");
}

export { v1, v2 };

admin.initializeApp();
