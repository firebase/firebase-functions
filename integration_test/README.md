## How to Use

**_ATTENTION_**: Running this test will wipe the contents of the Firebase project(s) you run it against. Make sure you use disposable Firebase project(s)!

Run the integration test as follows:

```bash
./run_tests.sh <project_id> [<project_id2>]
```

Test runs cycles of testing, once for Node.js 18 and another for Node.js 20.

Test uses locally installed firebase to invoke commands for deploying function. The test also requires that you have
gcloud CLI installed and authenticated (`gcloud auth login`).

Integration test is triggered by invoking HTTP function integrationTest which in turns invokes each function trigger
by issuing actions necessary to trigger it (e.g. write to storage bucket).

### Tested v2 Triggers

The integration tests now cover all v2 SDK triggers:
- **HTTPS**: onCall (including streaming), onRequest
- **Database**: onValueWritten, onValueCreated, onValueDeleted, onValueUpdated
- **Firestore**: onDocumentWritten, onDocumentCreated, onDocumentDeleted, onDocumentUpdated
- **Storage**: onObjectFinalized, onObjectDeleted, onObjectArchived, onObjectMetadataUpdated
- **Pub/Sub**: onMessagePublished (with retry support)
- **Scheduled**: onSchedule
- **Tasks**: onTaskDispatched (with retry support)
- **Remote Config**: onConfigUpdated
- **Test Lab**: onTestMatrixCompleted
- **Identity**: beforeUserCreated, beforeUserSignedIn
- **Eventarc**: onCustomEventPublished
- **Alerts**: Crashlytics, Billing, App Distribution, Performance alerts

### Debugging

The status and result of each test is stored in RTDB of the project used for testing. You can also inspect Cloud Logging
for more clues.
