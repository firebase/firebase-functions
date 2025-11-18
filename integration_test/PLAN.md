# Plan

# Structure

integration_test
  cli.ts
  tests <- vitest
    firestore.test.ts
    database.test.ts
  functions/
    package.json <-- "dependency": "firebase-functions": "file:../../"
    src/
      firestore.ts
      database.ts etc
      utils/ ...
  .gitignore <-- firebase.json

# Functions files

```ts
exports.firestoreOnCreate = onDocumentCreate((event) => {
  firestore.collection(...).doc(...).set(event)';
})
```

```ts
exports.firestoreOnCreate = onDocumentCreate((event) => {
  await sendEvent(event);
})

let topic;

async function(name: string, event: any): Promise<void> {
  topic ??= await pubsub.createTopic(process.env.RUN_ID);
  await topic.publishMessage({ name, event })
}
```

# Test Files

```
describe('triggers the correct document event', () => {
  beforeAll(() => {
    let event = await new Promise((resolve) => {
      setUpEventListener('firestoreOnCreate', (event) => {
        resolve(event);
      });

      await admin().firestore().collection(process.env.RUN_ID).doc('foo');
    });
    
  });

  test('whatever...');
});
```

# CLI

1. Generate a run id - 1234
2. Run build command in functions dir
3. write a `functions.json` file, which includes:

```
"functions": [
  {
    "source": "functions/dist",
    "codebase": "1234" // generated id
  },
]
```

4. spawns `RUN_ID=1234 firebase:deploy --only functions`
5. waits....
6. `RUN_ID=1234 vitest run`
7. On success or error: `firebase:functions delete 1234`

