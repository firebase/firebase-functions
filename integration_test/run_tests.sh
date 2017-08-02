#!/bin/bash
(
  echo "##### Building SDK..." &&
  (
    cd ../ &&
    rm -f firebase-functions-*.tgz &&
    npm run build:pack &&
    mv firebase-functions-*.tgz integration_test/functions/firebase-functions.tgz
  ) &&
  echo "##### Installing dependencies..." &&
  (
    cd functions &&
    npm install
  ) &&
  echo "##### Deploying empty index.js to project..." &&
  ./functions/node_modules/.bin/tsc -p functions/ &&  # Make sure the functions/lib directory actually exists.
  echo "" > functions/lib/index.js &&
  firebase deploy --debug 2> /dev/null &&
  echo &&
  echo "##### Project emptied. Deploying functions..." &&
  ./functions/node_modules/.bin/tsc -p functions/ &&
  firebase deploy --only functions --debug 2> /dev/null &&
  echo &&
  echo "##### Running the integration tests..." &&
  funcURL=$(tail -n 1 firebase-debug.log | awk '{ print $5 }') &&  # URL is printed on last line of log.
  wget --content-on-error -qO- $funcURL &&
  echo &&
  echo "##### Integration test run passed!" &&
  echo "##### Re-deploying the same functions, to make sure updates work..." &&
  firebase deploy --only functions --debug 2> /dev/null &&
  echo &&
  echo "##### Running the integration tests..." &&
  wget --content-on-error -qO- $funcURL &&
  echo &&
  echo "##### Integration test run passed!" &&
  echo "##### Removing all functions" &&
  echo "" > functions/lib/index.js &&
  firebase deploy --only functions --debug 2> /dev/null &&
  rm functions/firebase-functions.tgz &&
  rm -f functions/firebase-debug.log &&
  echo &&
  echo "##### All tests pass!"
) || (
  echo &&
  echo "XXXXX Something failed XXXXX" &&
  false  # Finish with an error code.
)
