# Firebase SDK for Cloud Functions

The `firebase-functions` package provides an SDK for defining Cloud Functions for Firebase.

Cloud Functions is a hosted, private, and scalable Node.js environment where you can run JavaScript code. The Firebase SDK for Cloud Functions integrates the Firebase platform by letting you write code that responds to events and invokes functionality exposed by other Firebase features.

## Learn more

Learn more about the Firebase SDK for Cloud Functions in the [Firebase documentation](https://firebase.google.com/docs/functions/) or [check out our samples](https://github.com/firebase/functions-samples).

## Migrating to v1

To migrate from a beta version of firebase-functions to v1, please refer to the [migration guide](https://firebase.google.com/docs/functions/beta-v1-diff).

## Usage

```js
// functions/index.js
const functions = require('firebase-functions');
const notifyUsers = require('./notify-users');

exports.newPost = functions.database
  .ref('/posts/{postId}')
  .onCreate((snapshot, context) => {
    console.log('Received new post with ID:', context.params.postId);
    return notifyUsers(snapshot.val());
  });
```

## Contributing

To contribute a change, [check out the contributing guide](.github/CONTRIBUTING.md).

## License

© Google, 2017. Licensed under [The MIT License](LICENSE).
