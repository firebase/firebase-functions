#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

function usage {
  echo "Usage: ${0} <project_id> [<token>]"
  exit 1
}

# This script takes in one required argument specifying a project_id and an
# optional arguement for a CI token that can be obtained by running
# `firebase login:ci`
# Example usage (from root dir) without token:
# ./integration_test/run_tests.sh chenky-test-proj
# Example usage (from root dir) with token:
# ./integration_test/run_tests.sh chenky-test-proj $TOKEN
if [[ "${1}" == "" ]]; then
  usage
fi

PROJECT_ID="${1}"
TIMESTAMP=$(date +%s)
TOKEN="${2}"

# Directory where this script lives.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function announce {
  echo -e "\n\n##### $1"
}

function build_sdk {
  announce "Building SDK..."
  cd "${DIR}/.."
  rm -f firebase-functions-*.tgz
  npm run build:pack
  mv firebase-functions-*.tgz "integration_test/functions/firebase-functions-${TIMESTAMP}.tgz"
}

function set_region {
  if [[ "${FIREBASE_FUNCTIONS_TEST_REGION}" == "" ]]; then
    FIREBASE_FUNCTIONS_TEST_REGION="us-central1"
  fi
  if [[ "${TOKEN}" == "" ]]; then 
    firebase functions:config:set functions.test_region=$FIREBASE_FUNCTIONS_TEST_REGION --project=$PROJECT_ID
  else
    firebase functions:config:set functions.test_region=$FIREBASE_FUNCTIONS_TEST_REGION --project=$PROJECT_ID --token=$TOKEN
  fi
  announce "Set region to ${FIREBASE_FUNCTIONS_TEST_REGION}"
}

function unset_region {
  if [[ "${TOKEN}" == "" ]]; then 
    firebase functions:config:unset functions.test_region --project=$PROJECT_ID
  else
    firebase functions:config:unset functions.test_region --project=$PROJECT_ID --token=$TOKEN
  fi
}

function pick_node8 {
  cd "${DIR}"
  cp package.node8.json functions/package.json
  # we have to do the -e flag here so that it work both on linux and mac os, but that creates an extra
  # backup file called package.json-e that we should clean up afterwards.
  sed -i -e "s/firebase-functions.tgz/firebase-functions-${TIMESTAMP}.tgz/g" functions/package.json
  rm -f functions/package.json-e
}

function pick_node10 {
  cd "${DIR}"
  cp package.node10.json functions/package.json
  # we have to do the -e flag here so that it work both on linux and mac os, but that creates an extra
  # backup file called package.json-e that we should clean up afterwards.
  sed -i -e "s/firebase-functions.tgz/firebase-functions-${TIMESTAMP}.tgz/g" functions/package.json
  rm -f functions/package.json-e
}

function install_deps {
  announce "Installing dependencies..."
  cd "${DIR}/functions"
  rm -rf node_modules/firebase-functions
  npm install
}

function delete_all_functions {
  announce "Deleting all functions in project..."
  cd "${DIR}"
  # Try to delete, if there are errors it is because the project is already empty,
  # in that case do nothing.
  if [[ "${TOKEN}" == "" ]]; then
    firebase functions:delete callableTests createUserTests databaseTests deleteUserTests firestoreTests integrationTests pubsubTests remoteConfigTests testLabTests --force --project=$PROJECT_ID || : &
  else
    firebase functions:delete callableTests createUserTests databaseTests deleteUserTests firestoreTests integrationTests pubsubTests remoteConfigTests testLabTests --force --project=$PROJECT_ID --token=$TOKEN || : &
  fi
  wait
  announce "Project emptied."
}

function deploy {
  cd "${DIR}"
  ./functions/node_modules/.bin/tsc -p functions/
  # Deploy functions, and security rules for database and Firestore. If the deploy fails, retry twice
  if [[ "${TOKEN}" == "" ]]; then
    for i in 1 2 3; do firebase deploy --project="${PROJECT_ID}" --only functions,database,firestore && break; done
  else
    for i in 1 2 3; do firebase deploy --project="${PROJECT_ID}" --token="${TOKEN}" --only functions,database,firestore && break; done
  fi
}

function run_tests {
  announce "Running integration tests..."

  # Construct the URL for the test function. This may change in the future,
  # causing this script to start failing, but currently we don't have a very
  # reliable way of determining the URL dynamically.
  TEST_DOMAIN="cloudfunctions.net"
  if [[ "${FIREBASE_FUNCTIONS_URL}" == "https://preprod-cloudfunctions.sandbox.googleapis.com" ]]; then
    TEST_DOMAIN="txcloud.net"
  fi
  if [[ "${FIREBASE_FUNCTIONS_TEST_REGION}" == "" ]]; then
    FIREBASE_FUNCTIONS_TEST_REGION="us-central1"
  fi
  TEST_URL="https://${FIREBASE_FUNCTIONS_TEST_REGION}-${PROJECT_ID}.${TEST_DOMAIN}/integrationTests"
  echo "${TEST_URL}"

  curl --fail "${TEST_URL}"
}

function cleanup {
  announce "Performing cleanup..."
  delete_all_functions
  unset_region
  rm "${DIR}/functions/firebase-functions-${TIMESTAMP}.tgz"
  rm "${DIR}/functions/package.json"
  rm -f "${DIR}/functions/firebase-debug.log"
  rm -rf "${DIR}/functions/lib"
  rm -rf "${DIR}/functions/node_modules"
}

# Setup
build_sdk
delete_all_functions
set_region

# Node 8 tests
pick_node8
install_deps
announce "Deploying functions to Node 8 runtime ..."
deploy
run_tests

# Node 10 tests
pick_node10
install_deps
announce "Re-deploying the same functions to Node 10 runtime ..."
deploy
run_tests

# Cleanup
cleanup
announce "All tests pass!"
