#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

PROJECT_ID="${GCLOUD_PROJECT}"
TIMESTAMP=$(date +%s)

if [[ "${PROJECT_ID}" == "" ]]; then
  echo "process.env.GCLOUD_PROJECT cannot be empty"
  exit 1
fi

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

# Creates a Package.json from package.json.template
# @param timestmap of the current SDK build
# @param Node version to test under
function create_package_json {
  cd "${DIR}"
  cp package.json.template functions/package.json
  # we have to do the -e flag here so that it work both on linux and mac os, but that creates an extra
  # backup file called package.json-e that we should clean up afterwards.
  sed -i -e "s/__SDK_TARBALL__/firebase-functions-$1.tgz/g" functions/package.json
  sed -i -e "s/__NODE_VERSION__/$2/g" functions/package.json
  sed -i -e "s/__FIREBASE_ADMIN__/$3/g" functions/package.json
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
  firebase functions:delete integrationTests v1 v2 --force --project=$PROJECT_ID || : &
  wait
  announce "Project emptied."
}

function deploy {
  # Deploy functions, and security rules for database and Firestore. If the deploy fails, retry twice
  for i in 1 2; do firebase deploy --project="${PROJECT_ID}" --only functions,database,firestore && break; done
}

function run_tests {
  announce "Running integration tests..."

  # Construct the URL for the test function. This may change in the future,
  # causing this script to start failing, but currently we don't have a very
  # reliable way of determining the URL dynamically.
  TEST_DOMAIN="cloudfunctions.net"
  if [[ "${FIREBASE_FUNCTIONS_TEST_REGION}" == "" ]]; then
    FIREBASE_FUNCTIONS_TEST_REGION="us-central1"
  fi
  TEST_URL="https://${FIREBASE_FUNCTIONS_TEST_REGION}-${PROJECT_ID}.${TEST_DOMAIN}/integrationTests"
  echo "${TEST_URL}"

  curl --fail -H "Authorization: Bearer $(gcloud auth print-identity-token)" "${TEST_URL}"
}

function cleanup {
  announce "Performing cleanup..."
  delete_all_functions
  rm "${DIR}/functions/firebase-functions-${TIMESTAMP}.tgz"
  rm "${DIR}/functions/package.json"
  rm -f "${DIR}/functions/firebase-debug.log"
  rm -rf "${DIR}/functions/lib"
  rm -rf "${DIR}/functions/node_modules"
}

# Setup
build_sdk
delete_all_functions

for version in 14 16; do
  create_package_json $TIMESTAMP $version "^10.0.0"
  install_deps
  announce "Re-deploying the same functions to Node $version runtime ..."
  deploy
  run_tests
done

# Cleanup
cleanup
announce "All tests pass!"
