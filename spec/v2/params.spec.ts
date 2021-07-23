import { expect } from 'chai';
import {
  getBoolean,
  getFloat,
  getInt,
  getJSON,
  getList,
  getString,
} from '../../src/v2/params';
import { Param, ParamOptions } from '../../src/v2/params/types';

const TEST_PARAM = 'TEST_PARAM';

describe.only('declarative params', () => {
  beforeEach(() => {
    delete process.env[TEST_PARAM];
  });

  const VALUE_TESTS: {
    method: (name: string, options: ParamOptions<any>) => Param;
    tests: {
      title: string;
      env?: string;
      options?: ParamOptions;
      expect: any;
    }[];
  }[] = [
    {
      method: getString,
      tests: [
        {
          title: "should return a '' zero value when no value and no undefined",
          expect: '',
        },
        {
          title: 'should return the default when no value and one is provided',
          env: undefined,
          options: { default: 'test_val' },
          expect: 'test_val',
        },
        {
          title: 'should return the value over the default',
          env: 'expected_val',
          options: { default: 'default_val' },
          expect: 'expected_val',
        },
      ],
    },
    {
      method: getInt,
      tests: [
        {
          title: 'should return 0 zero value',
          expect: 0,
        },
        {
          title: 'should coerce a matching string into an int',
          env: '25',
          expect: 25,
        },
        {
          title: 'should return a matching default value',
          options: { default: 10 },
          expect: 10,
        },
      ],
    },
    {
      method: getFloat,
      tests: [
        {
          title: 'should return 0 zero value',
          expect: 0,
        },
        {
          title: 'should coerce a matching string into a float',
          env: '3.14',
          expect: 3.14,
        },
        {
          title: 'should return a matching default value',
          options: { default: 10.1 },
          expect: 10.1,
        },
      ],
    },
    {
      method: getBoolean,
      tests: [
        {
          title: 'should return false zero value',
          expect: false,
        },
        {
          title: 'should coerce "true" into true',
          env: 'true',
          expect: true,
        },
        {
          title: 'should coerce "TrUe" into true',
          env: 'TrUe',
          expect: true,
        },
        {
          title: 'should coerce "yes" into true',
          env: 'yes',
          expect: true,
        },
        {
          title: 'should coerce "1" into true',
          env: '1',
          expect: true,
        },
        {
          title: 'should coerce "false" into false',
          env: 'false',
          options: { default: true },
          expect: false,
        },
        {
          title: 'should coerce "FaLsE" into false',
          env: 'FaLsE',
          options: { default: true },
          expect: false,
        },
        {
          title: 'should coerce "no" into false',
          env: 'no',
          options: { default: true },
          expect: false,
        },
        {
          title: 'should coerce "0" into false',
          env: '0',
          options: { default: true },
          expect: false,
        },
        {
          title: 'should return a matching default value',
          options: { default: true },
          expect: true,
        },
      ],
    },
    {
      method: getList,
      tests: [
        {
          title: 'should return [] zero value',
          expect: [],
        },
        {
          title: 'should coerce comma-separated values into a string list',
          env: 'first,second,third',
          expect: ['first', 'second', 'third'],
        },
        {
          title:
            'should coerce a comma-and-space-separated values into a string list',
          env: 'first, second, third',
          expect: ['first', 'second', 'third'],
        },
        {
          title: 'should return a matching default value',
          options: { default: ['a', 'b', 'c'] },
          expect: ['a', 'b', 'c'],
        },
      ],
    },
    {
      method: getJSON,
      tests: [
        {
          title: 'should return null zero value',
          expect: null,
        },
        {
          title: 'should coerce objects from JSON',
          env: '{"test":123}',
          expect: { test: 123 },
        },
        {
          title: 'should coerce arrays from JSON',
          env: '["test",123]',
          expect: ['test', 123],
        },
        {
          title: 'should return a matching default value',
          options: { default: { test: 123 } },
          expect: { test: 123 },
        },
      ],
    },
  ];

  for (const group of VALUE_TESTS) {
    describe(`${group.method.name}().value`, () => {
      for (const test of group.tests) {
        it(test.title, () => {
          if (typeof test.env !== 'undefined') {
            process.env[TEST_PARAM] = test.env;
          }

          expect(group.method(TEST_PARAM, test.options).value).to.deep.eq(
            test.expect
          );
        });
      }
    });
  }
});
