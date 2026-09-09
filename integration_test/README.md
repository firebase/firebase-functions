## How to Use

**_ATTENTION_**: Running this test will wipe the contents of the Firebase project(s) you run it against. Make sure you use disposable Firebase project(s)!

Set env variable for the test project:
export GCLOUD_PROJECT=<project_id>

Run the integration test as follows:

```bash
./run_tests.sh
```

Test runs cycles of testing, once for Node.js 14 and another for Node.js 16.

Test uses locally installed firebase to invoke commands for deploying function. The test also requires that you have
gcloud CLI installed and authenticated (`gcloud auth login`).

Integration test is triggered by invoking HTTP function integrationTest which in turns invokes each function trigger
by issuing actions necessary to trigger it (e.g. write to storage bucket).

### Debugging

The status and result of each test is stored in RTDB of the project used for testing. You can also inspect Cloud Logging
for more clues.
