#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

function usage {
  echo "Usage: $0 <project_id_node_6> [<project_id_node_8>]"
  exit 1
}

# This script takes 1 or 2 params, both of which are Firebase project ids.
# If there is only one given, that project will be used for both node6 and node8
# Otherwise, param1 will be used for node6
# and param2 will be used for node8
# The first parameter is required and is the Firebase project id.
if [[ $1 == "" ]]; then
  usage
fi
if [[ $2 == "" ]]; then
  PROJECT_ID_NODE_6=$1
  PROJECT_ID_NODE_8=$1
else
  PROJECT_ID_NODE_6=$1
  PROJECT_ID_NODE_8=$2
fi

# Directory where this script lives.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function announce {
  echo -e "\n\n##### $1"
}

function build_sdk {
  announce "Building SDK..."
  cd $DIR/..
  rm -f firebase-functions-*.tgz
  npm run build:pack
  mv firebase-functions-*.tgz integration_test/functions/firebase-functions.tgz
}

function pick_node6 {
  cd $DIR
  PROJECT_ID=$PROJECT_ID_NODE_6
  cp package.node6.json functions/package.json
}

function pick_node8 {
  cd $DIR
  PROJECT_ID=$PROJECT_ID_NODE_8
  cp package.node8.json functions/package.json
}

function install_deps {
  announce "Installing dependencies..."
  cd $DIR/functions
  rm -rf node_modules/firebase-functions
  npm install
}

function delete_all_functions {
  announce "Deleting all functions in project..."
  cd $DIR
  # Try to delete, if there are errors it is because the project is already empty,
  # in that case do nothing. 
  firebase functions:delete callableTests createUserTests databaseTests deleteUserTests firestoreTests integrationTests pubsubTests remoteConfigTests --force --project=$PROJECT_ID_NODE_6 || : &
  if ! [[ $PROJECT_ID_NODE_6 == $PROJECT_ID_NODE_8 ]]; then
    firebase functions:delete callableTests createUserTests databaseTests deleteUserTests firestoreTests integrationTests pubsubTests remoteConfigTests --force --project=$PROJECT_ID_NODE_8 || : &
  fi
  wait
  announce "Project emptied."
}

function deploy {
  cd $DIR
  ./functions/node_modules/.bin/tsc -p functions/
  # Deploy functions, and security rules for database and Firestore. If the deploy fails, retry twice
  for i in 1 2 3; do firebase deploy --project=$PROJECT_ID --only functions,database,firestore && break; done
}

# At the moment, functions take 30-40 seconds AFTER firebase deploy returns successfully to go live
# This needs to be fixed separately
# However, so that we have working integration tests in the interim, waitForPropagation is a workaround
function waitForPropagation {
  announce "Waiting 50 seconds for functions changes to propagate"
  sleep 50
}

function run_all_tests {
  announce "Running the integration tests..."

  # Constructs the URLs for both test functions. This may change in the future,
  # causing this script to start failing, but currently we don't have a very
  # reliable way of determining the URL dynamically.
  TEST_DOMAIN="cloudfunctions.net"
  if [[ $FIREBASE_FUNCTIONS_URL == "https://preprod-cloudfunctions.sandbox.googleapis.com" ]]; then
    TEST_DOMAIN="txcloud.net"
  fi
  TEST_URL_NODE_6="https://us-central1-$PROJECT_ID_NODE_6.$TEST_DOMAIN/integrationTests"
  TEST_URL_NODE_8="https://us-central1-$PROJECT_ID_NODE_8.$TEST_DOMAIN/integrationTests"
  echo $TEST_URL_NODE_6
  echo $TEST_URL_NODE_8
  curl --fail $TEST_URL_NODE_6 & NODE6PID=$!
  curl --fail $TEST_URL_NODE_8 & NODE8PID=$!
  wait $NODE6PID && echo 'node 6 passed' || (announce 'Node 6 tests failed'; cleanup; announce 'Tests failed'; exit 1)
  wait $NODE8PID && echo 'node 8 passed' || (announce 'Node 8 tests failed'; cleanup; announce 'Tests failed'; exit 1)
}

function run_tests {
  announce "Running the integration tests..."

  # Construct the URL for the test function. This may change in the future,
  # causing this script to start failing, but currently we don't have a very
  # reliable way of determining the URL dynamically.
  TEST_DOMAIN="cloudfunctions.net"
  if [[ $FIREBASE_FUNCTIONS_URL == "https://preprod-cloudfunctions.sandbox.googleapis.com" ]]; then
    TEST_DOMAIN="txcloud.net"
  fi
  TEST_URL="https://us-central1-$PROJECT_ID.$TEST_DOMAIN/integrationTests"
  echo $TEST_URL

  curl --fail $TEST_URL
}

function cleanup {
  announce "Performing cleanup..."
  delete_all_functions
  rm $DIR/functions/firebase-functions.tgz
  rm $DIR/functions/package.json
  rm -f $DIR/functions/firebase-debug.log
  rm -rf $DIR/functions/node_modules/firebase-functions
}

function setConfig {
  firebase functions:config:set test.test_domain=$TEST_URL
}

build_sdk
pick_node8
install_deps
delete_all_functions
announce "Deploying functions to Node 8 runtime ..."
setConfig
deploy
if [[ $PROJECT_ID_NODE_6 == $PROJECT_ID_NODE_8 ]]; then
  waitForPropagation
  run_tests
fi
pick_node6
announce "Re-deploying the same functions to Node 6 runtime ..."
setConfig
deploy
waitForPropagation
if [[ $PROJECT_ID_NODE_6 == $PROJECT_ID_NODE_8 ]]; then
  run_tests
else
  run_all_tests
fi
cleanup
announce "All tests pass!"
