#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

function usage {
  echo "Usage: $0 <project_id>"
  exit 1
}

# The first parameter is required and is the Firebase project id.
if [[ $1 == "" ]]; then
  usage
fi
PROJECT_ID=$1

# Directory where this script lives.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

function announce {
  echo -e "\n##### $1"
}

function build_sdk {
  announce "Building SDK..."
  cd $DIR/..
  rm -f firebase-functions-*.tgz
  npm run build:pack
  mv firebase-functions-*.tgz integration_test/functions/firebase-functions.tgz
}

function install_deps {
  announce "Installing dependencies..."
  cd $DIR/functions
  npm install
}

function delete_all_functions {
  announce "Deploying empty index.js to project..."
  cd $DIR
  ./functions/node_modules/.bin/tsc -p functions/ # Make sure the functions/lib directory actually exists.
  echo "" > functions/lib/index.js
  firebase deploy --project=$PROJECT_ID --only functions
  announce "Project emptied."
}

function deploy {
  announce "Deploying functions..."
  cd $DIR
  ./functions/node_modules/.bin/tsc -p functions/
  firebase deploy --project=$PROJECT_ID --only functions
}

function run_tests {
  announce "Running the integration tests..."
  funcURL=$(tail -n 1 $DIR/firebase-debug.log | awk '{ print $5 }') # URL is printed on last line of log.
  curl -s --fail $funcURL
}

function cleanup {
  announce "Performing cleanup..."
  delete_all_functions
  rm $DIR/functions/firebase-functions.tgz
  rm -f $DIR/functions/firebase-debug.log
}

build_sdk
install_deps
delete_all_functions
deploy
run_tests
announce "Re-deploying the same functions to make sure updates work..."
deploy
run_tests
cleanup
announce "All tests pass!"
