## Key Guidelines

- Always use 2nd-gen functions for new development.
- Use 1st-gen functions _only_ for Analytics and basic Auth triggers, since those aren't supported by 2nd gen.
- Use `firebase-functions` SDK version 6.0.0 and above
- Use top-level imports (e.g., `firebase-functions/https`). These are 2nd gen by default. If 1st gen is required (Analytics or basic Auth triggers), import from the `firebase-functions/v1` import path.

## Configuration: Use Secret Params for API Keys

For sensitive information like API keys (e.g., for LLMs, payment providers, etc.), **always** use `defineSecret`. This stores the value securely in Cloud Secret Manager.

```typescript
import { onRequest } from "firebase-functions/https";
import { logger } from "firebase-functions/logger";
import { defineString, defineSecret } from "firebase-functions/params";

// Securely define an LLM API key
const LLM_API_KEY = defineSecret("LLM_API_KEY");

// Example function that uses the secret
export const callLlm = onRequest({ secrets: [LLM_API_KEY] }, async (req, res) => {
  const apiKey = LLM_API_KEY.value();

  // Use the apiKey to make a call to the LLM service
  logger.info("Calling LLM with API key.");

  // insert code here to call LLM...

  res.send("LLM API call initiated.");
});
```

The CLI will prompt for secret's value at deploy time. Alternatively, a human can set the secret using the Firebase CLI command:

```bash
firebase functions:secrets:set <SECRET_NAME>
```

If you see an API key being accessed with `functions.config` in existing functions code, offer to upgrade to params.

## Use the Firebase Admin SDK

To interact with Firebase services like Firestore, Auth, or RTDB from within your functions, you need to initialize the Firebase Admin SDK. Call `initializeApp` without any arguments so that Application Default Credentials are used.

1.  **Install the SDK:**

    ```bash
    npm i firebase-admin
    ```

2.  **Initialize in your code:**

    ```typescript
    import * as admin from "firebase-admin";
    import { onInit } from "firebase-functions";

    onInit(() => {
      admin.initializeApp();
    });
    ```

    This should be done once at the top level of your `index.ts` file.

## Common Imports

```typescript
import { onRequest, onCall, onCallGenkit } from "firebase-functions/https";
import { onDocumentUpdated } from "firebase-functions/firestore";
import { onNewFatalIssuePublished } from "firebase-functions/alerts/crashlytics";
import { onValueWritten } from "firebase-functions/database";
import { onSchedule } from "firebase-functions/scheduler";
const { onTaskDispatched } = require("firebase-functions/tasks");
import { onObjectFinalized } from "firebase-functions/storage";
import { onMessagePublished } from "firebase-functions/pubsub";
import { beforeUserSignedIn } from "firebase-functions/identity";
import { onTestMatrixCompleted } from "firebase-functions/testLab";
import { logger, onInit } from "firebase-functions";
import { defineString, defineSecret } from "firebase-functions/params";
```

A human can find code samples for these triggers in the [functions-samples repository](https://github.com/firebase/functions-samples/tree/main/Node).

## 1st-gen Functions (Legacy Triggers)

Use the `firebase-functions/v1` import for Analytics and basic Auth triggers. These aren't supported in 2nd gen.

```typescript
import * as functionsV1 from "firebase-functions/v1";

// v1 Analytics trigger
export const onPurchase = functionsV1.analytics.event("purchase").onLog(async (event) => {
  logger.info("Purchase event", { value: event.params?.value });
});

// v1 Auth trigger
export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  logger.info("User created", { uid: user.uid });
});
```

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run emulators for local development
# This is a long-running command. A human can run this command themselves to start the emulators:
firebase emulators:start --only functions

# Deploy functions
firebase deploy --only functions
```
