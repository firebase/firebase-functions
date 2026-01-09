# Integration testing

This directory contains end-to-end integration tests for the Firebase Functions SDK. These tests deploy real Cloud Functions to a Firebase project and verify their behavior by triggering events and validating responses.

## Prerequisites

- Node.js 18+ installed
- Firebase CLI installed and authenticated (`npm install -g firebase-tools`)
- Access to a Firebase test project

## Setup

Add your firebase config to `/src/config`.

```js
export const config = {
  // Add Firebase config here
};
```

Set your local project to match the configuration.

```bash
  firebase use <project-id>
```

## Usage

```bash
npm i
npm run test
```

## Overview

The integration test suite:

- Builds and packages the local Firebase Functions SDK
- Deploys both v1 and v2 Cloud Functions to a test project
- Runs comprehensive tests against deployed functions
- Validates function triggers, event handling, and data flow
- Cleans up resources after test completion

Tests cover all major function types including HTTPS, Firestore, Realtime Database, Storage, PubSub, Authentication, Scheduler, Tasks, and more.

## Running Tests

Using `npm run test`. This will:

1. Build the SDK from source
2. Deploy all functions to the configured Firebase project
3. Wait for functions to provision
4. Execute the test suite
5. Clean up deployed functions

## Known issues

### Updating multiple versions functions for storage causes a pre-condition error

For this test suite v1 and v2 storage functions have been separated to mitigate against function deployment errors. When deploying all functions simultaneously, the following error may occur:

```js
{
  "protoPayload": {
    "methodName": "storage.buckets.update",
    "status": {
      "code": 9,
      "message": "At least one of the pre-conditions you specified did not hold."
    }
  },
  "principalEmail": "..."
}
```

To mitigate this, the test suite includes a delay between deploying v1 and v2 storage functions.

### Storage onObjectDeleted

These tests are skipped as the timeDeleted field is not included in the Storage event data sent by Google Cloud.

### onObjectMetadataUpdated

Custom metadata is not being sent in the metadata update event payload.

### onObjectFinalized

The metadata and timeCreated fields are not included in the Storage finalize event data sent by Google Cloud.

### Auth Identity v2

Any `beforeUser` functions cannot be tested without manual setup.

#### beforeUserCreated & beforeUserSignedIn

It is currently not possible to create a function in advance and assign via the API.

The Identity Toolkit REST API endpoint <https://identitytoolkit.googleapis.com/v2/projects/{projectId}/config> exhibits a false positive behaviour:

API Returns Success: When setting blocking function triggers with correct event types (beforeCreate, beforeSignIn), the API returns 200 OK.

Configuration Appears Set: The API response shows the triggers are configured with timestamps. GCP, however is not updated despite the successful API response, the blocking functions are not actually configured in Google Cloud Platform.

[API source](https://identitytoolkit.googleapis.com/$discovery/rest?version=v2)

### Multiple storage function deployments

An intermittent error occurs when deploying functions related to storage, causing deployments to fail. A delay has been added to the test framework to allow functions to propagate before deploying additional functions and running the test suite.

### Service identity via Function deployment

There is an intermittent issue on deploying functions. Running the test suite will occasionally result in one of the following" errors:

```bash
functions: generating the service identity for pubsub.googleapis.com...
functions: generating the service identity for eventarc.googleapis.com...
```

Retrying the suite will result in a successful deployment following a time delay >5 minutes.

### Delay on Firestore initial propogation

Following the deployment of a Firestore function, events do not always fire. A delay is required (30 seconds) to ensure the function has completed installation steps before firing an event.
