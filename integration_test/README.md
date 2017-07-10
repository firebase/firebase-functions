How to Use
---------

***ATTENTION***: Running this test will wipe the contents of the Firebase project you run it against. Make sure you use a disposable Firebase project!

Run the integration test as follows:

```bash
firebase use $YOURPROJECTID # add your own project
./run_tests.sh
```

Follow the instructions output by the script. You'll click on a number of HTTPS function links.  The integration test for HTTPS is that it properly kicks off other integration tests and redirects you to the database console. From there the other integration test suites will write their results back to the database, where you can check the results.
