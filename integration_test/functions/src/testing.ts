import * as firebase from 'firebase-admin';
import { EventContext } from 'firebase-functions';

export type TestCase<T> = (data: T, context?: EventContext) => any;
export interface TestCaseMap<T> {
  [key: string]: TestCase<T>;
}

export class TestSuite<T> {
  private name: string;
  private tests: TestCaseMap<T>;

  constructor(name: string, tests: TestCaseMap<T> = {}) {
    this.name = name;
    this.tests = tests;
  }

  it(name: string, testCase: TestCase<T>): TestSuite<T> {
    this.tests[name] = testCase;
    return this;
  }

  run(testId: string, data: T, context?: EventContext): Promise<any> {
    const running: Array<Promise<any>> = [];
    for (const testName in this.tests) {
      if (!this.tests.hasOwnProperty(testName)) {
        continue;
      }
      const run = Promise.resolve()
        .then(() => this.tests[testName](data, context))
        .then(
          (result) => {
            console.log(
              `${result ? 'Passed' : 'Failed with successful op'}: ${testName}`
            );
            return { name: testName, passed: !!result };
          },
          (error) => {
            console.error(`Failed: ${testName}`, error);
            return { name: testName, passed: 0, error };
          }
        );
      running.push(run);
    }
    return Promise.all(running).then((results) => {
      let sum = 0;
      results.forEach((val) => (sum = sum + val.passed));
      const summary = `passed ${sum} of ${running.length}`;
      const passed = sum === running.length;
      console.log(summary);
      const result = { passed, summary, tests: results };
      return firebase
        .database()
        .ref(`testRuns/${testId}/${this.name}`)
        .set(result);
    });
  }
}

export function success() {
  return Promise.resolve().then(() => true);
}

function failure(reason: string) {
  return Promise.reject(reason);
}

export function evaluate(value: boolean, errMsg: string) {
  if (value) {
    return success();
  }
  return failure(errMsg);
}

export function expectEq(left: any, right: any) {
  return evaluate(
    left == right,
    JSON.stringify(left) + ' does not equal ' + JSON.stringify(right)
  );
}

function deepEq(left: any, right: any) {
  if (left === right) {
    return true;
  }

  if (!(left instanceof Object && right instanceof Object)) {
    return false;
  }

  if (Object.keys(left).length != Object.keys(right).length) {
    return false;
  }

  for (const key in left) {
    if (!right.hasOwnProperty(key)) {
      return false;
    }
    if (!deepEq(left[key], right[key])) {
      return false;
    }
  }

  return true;
}

export function expectDeepEq(left: any, right: any) {
  return evaluate(
    deepEq(left, right),
    `${JSON.stringify(left)} does not deep equal ${JSON.stringify(right)}`
  );
}

export function expectMatches(input: string, regexp: RegExp) {
  return evaluate(
    input.match(regexp) !== null,
    "Input '" + input + "' did not match regexp '" + regexp + "'"
  );
}

export function expectReject<EventType>(f: (e: EventType) => Promise<void>) {
  return async (event: EventType) => {
    let rejected = false;
    try {
      await f(event);
    } catch {
      rejected = true;
    }

    if (!rejected) {
      throw new Error('Test should have returned a rejected promise');
    }
  };
}
