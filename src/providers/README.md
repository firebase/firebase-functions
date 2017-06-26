# The Cloud Functions for Firebase Event Providers
Check out [the Cloud Functions for Firebase documentation](https://firebase.google.com/docs/functions/) for information on how to use the APIs in these packages.

### The `datastore` provider
The Datastore integration is in early preview, and not yet publicly usable.
If you'd like to request early access to use this integration, [please fill out this form](https://services.google.com/fb/forms/firebasealphaprogram/).

There will be a breaking change in the type returned by event.data.data() in the future. Values that represent database references are currently path strings. A future revision update to the SDK will change this to reference objects. To protect against this and other unintended breaking changes, consider depending on an exact version of the firebase-functions SDK in your package.json.
