## How to Use

**_ATTENTION_**: Running this test will wipe the contents of the Firebase project(s) you run it against. Make sure you use disposable Firebase project(s)!

Run the integration test as follows:

```bash
./run_tests.sh <project_id> [<project_id2>]
```

If just one project_id is provided, the both the node6 and node8 tests will be run on that project, in series. If two project_ids are provided, the node6 tests will be run on the first project and the node8 tests will be run on the second one, in parallel.

The tests run fully automatically, and will print the result on standard out. The integration test for HTTPS is that it properly kicks off other integration tests and returns a result. From there the other integration test suites will write their results back to the database, where you can check the detailed results if you'd like.
