# firebase-functions

The `firebase-functions` package provides an SDK for defining Firebase Functions.

## Installation

In your Firebase project's `functions` directory, run:

    npm install firebase-functions

## Usage

```js
// functions/index.js
var functions = require('firebase-functions');
var notifyUsers = require('./notify-users');

exports.newPost = functions.database()
  .path('/posts/{postId}')
  .on('write', function(event) {
    // only execute function on creation
    if (!event.data.prior().exists()) {
      notifyUsers(event.data.val());
    }
  });
```
