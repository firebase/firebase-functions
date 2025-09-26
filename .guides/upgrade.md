# Upgrading Firebase Functions to 2nd Gen

This guide summarizes the process of migrating Cloud Functions from 1st to 2nd generation. You can migrate functions incrementally, running both generations side-by-side.

## 1. Update Dependencies

Update your `firebase-functions` and `firebase-admin` SDKs, and ensure you are using a recent version of the Firebase CLI.

## 2. Modify Imports

Update your import statements to use the `v2` subpackage.

**Before (1st Gen):**
```typescript
import * as functions from "firebase-functions";
```

**After (2nd Gen):**
```typescript
import * as functions from "firebase-functions/v2";
```

## 3. Update Trigger Definitions

The SDK is now more modular. Update your trigger definitions accordingly.

### HTTP Triggers

**Before (1st Gen):**
```typescript
export const webhook = functions.https.onRequest((request, response) => {
  // ...
});
```

**After (2nd Gen):**
```typescript
import {onRequest} from "firebase-functions/v2/https";

export const webhook = onRequest((request, response) => {
  // ...
});
```

### Callable Triggers

**Before (1st Gen):**
```typescript
export const getprofile = functions.https.onCall((data, context) => {
  // ...
});
```

**After (2nd Gen):**
```typescript
import {onCall} from "firebase-functions/v2/https";

export const getprofile = onCall((request) => {
  // ...
});
```

### Background Triggers (Pub/Sub)

**Before (1st Gen):**
```typescript
export consthellopubsub = functions.pubsub.topic("topic-name").onPublish((message) => {
  // ...
});
```

**After (2nd Gen):**
```typescript
import {onMessagePublished} from "firebase-functions/v2/pubsub";

export consthellopubsub = onMessagePublished("topic-name", (event) => {
  // ...
});
```

## 4. Use Parameterized Configuration

Migrate from `functions.config()` to the new `params` module for environment configuration. This provides strong typing and validation.

**Before (`.runtimeconfig.json`):**
```json
{
  "someservice": {
    "key": "somesecret"
  }
}
```
**And in code (1st Gen):**
```typescript
const SKEY = functions.config().someservice.key;
```

**After (2nd Gen):**
Define params in your code and set their values during deployment.

**In `index.ts`:**
```typescript
import {defineString} from "firebase-functions/params";

const SOMESERVICE_KEY = defineString("SOMESERVICE_KEY");
```
Use `SOMESERVICE_KEY.value()` to access the value. For secrets like API keys, use `defineSecret`.

**In `index.ts`:**
```typescript
import {defineSecret} from "firebase-functions/params";

const SOMESERVICE_KEY = defineSecret("SOMESERVICE_KEY");
```
You will be prompted to set the value on deployment, which is stored securely in Cloud Secret Manager.

## 5. Update Runtime Options

Runtime options are now set directly within the function definition.

**Before (1st Gen):**
```typescript
export const func = functions
  .runWith({
    // Keep 5 instances warm
    minInstances: 5,
  })
  .https.onRequest((request, response) => {
    // ...
  });
```

**After (2nd Gen):**
```typescript
import {onRequest} from "firebase-functions/v2/https";

export const func = onRequest(
  {
    // Keep 5 instances warm
    minInstances: 5,
  },
  (request, response) => {
    // ...
  }
);
```

## 6. Traffic Migration

To migrate traffic safely:
1.  Rename your new 2nd gen function with a different name.
2.  Deploy it alongside the old 1st gen function.
3.  Gradually introduce traffic to the new function (e.g., via client-side changes or by calling it from the 1st gen function).
4.  Once you are confident, you can delete the 1st gen function.
