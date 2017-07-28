How to Use
---------

***ATTENTION***: Running this test will wipe the contents of the Firebase project you run it against. Make sure you use a disposable Firebase project!

Run the integration test as follows:

```bash
firebase init # Don't choose to use any features, select your project.
./run_tests.sh
```

The tests run fully automatically, and will print the result on standard out. The integration test for HTTPS is that it properly kicks off other integration tests and returns a result. From there the other integration test suites will write their results back to the database, where you can check the detailed results if you'd like.
