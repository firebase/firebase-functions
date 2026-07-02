const functions = require("firebase-functions");

// This will cause a syntax error
exports.broken = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!"
}); // Missing closing parenthesis