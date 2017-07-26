#!/bin/bash
echo "#### Building SDK..." &&
(cd ../ && rm firebase-functions-*.tgz && npm run build:pack &&
mv firebase-functions-*.tgz integration_test/functions/firebase-functions.tgz) &&
echo "#### Installing dependencies..." &&
(cd functions && npm install) &&
echo "##### Deploying empty index.js to project..." &&
./functions/node_modules/.bin/tsc -p functions/ &&  # Make sure the functions/lib directory actually exists.
echo "" > functions/lib/index.js &&
firebase deploy --debug 2> ./deploy-debug.log &&
echo &&
echo "##### Project emptied. Deploying functions..." &&
./functions/node_modules/.bin/tsc -p functions/ &&
firebase deploy --only functions --debug 2> ./deploy-debug.log &&
echo &&
echo "##### Please click the 'integrationTests' link above!" &&
read -n1 -r -p "##### Press [return] when you've confirmed the tests have passed." &&
echo "##### Re-deploying the same functions, to make sure updates work..." &&
firebase deploy --only functions --debug 2> ./deploy-debug.log &&
echo &&
echo "##### Please click the 'integrationTests' link above!" &&
read -n1 -r -p "##### Press [return] when you've confirmed the tests have passed." &&
echo "##### Removing all functions" &&
echo "" > functions/lib/index.js &&
firebase deploy --debug 2> ./deploy-debug.log &&
rm functions/firebase-functions.tgz
echo &&
echo "##### Done! Please verify that your project is empty."
