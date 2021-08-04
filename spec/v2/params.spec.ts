import { expect } from 'chai';
import {
  declaredParams,
  defineBoolean,
  defineFloat,
  defineInt,
  defineJSON,
  defineList,
  defineString,
} from '../../src/v2/params';
import { ListParam, Param, ParamOptions } from '../../src/v2/params/types';

const TEST_PARAM = 'TEST_PARAM';

describe('params', () => {
  beforeEach(() => {
    delete process.env[TEST_PARAM];
  });

  const VALUE_TESTS: Array<{
    method: (name: string, options: ParamOptions<any>) => Param;
    tests: Array<{
      title: string;
      env?: string;
      options?: ParamOptions;
      expect?: any;
      throws?: boolean;
    }>;
  }> = [
    {
      method: defineString,
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
      method: defineInt,
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
        {
          title: 'should throw when invalid value is passed',
          env: 'not_a_number',
          throws: true,
        },
      ],
    },
    {
      method: defineFloat,
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
        {
          title: 'should throw when invalid value is passed',
          env: 'not_a_number',
          throws: true,
        },
      ],
    },
    {
      method: defineBoolean,
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
        {
          title: 'should error with non-true/false value',
          env: 'foo',
          throws: true,
        },
      ],
    },
    {
      method: defineList,
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
      method: defineJSON,
      tests: [
        {
          title: 'should return {} zero value',
          expect: {},
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
        {
          title: 'should throw with invalid JSON',
          env: '{"invalid":json',
          throws: true,
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

          if (test.throws) {
            expect(
              () => group.method(TEST_PARAM, test.options).value
            ).to.throw();
          } else {
            expect(group.method(TEST_PARAM, test.options).value).to.deep.eq(
              test.expect
            );
          }
        });
      }
    });
  }

  describe('Param', () => {
    describe('#toSpec()', () => {
      it('should cast non-string defaults to strings', () => {
        expect(new Param(TEST_PARAM, { default: 123 }).toSpec().default).to.eq(
          '123'
        );
      });

      it('should passthrough supplied options', () => {
        expect(
          new Param(TEST_PARAM, { description: 'hello expect' }).toSpec()
            .description
        ).to.eq('hello expect');
      });

      it('ListParam should properly stringify its default', () => {
        const spec = new ListParam(TEST_PARAM, {
          default: ['a', 'b', 'c'],
        }).toSpec();
        expect(spec.default).to.eq('a,b,c');
      });
    });
  });

  it('should add a param to the declared params', () => {
    const param = defineString(TEST_PARAM);
    expect(declaredParams.find((p) => p === param)).to.eq(param);
  });

  it('should replace a samed-name param in the declared params', () => {
    const oldParam = defineString(TEST_PARAM);
    expect(declaredParams.find((p) => p === oldParam)).to.eq(oldParam);
    const param = defineString(TEST_PARAM);
    expect(declaredParams.find((p) => p === oldParam)).to.be.undefined;
    expect(declaredParams.find((p) => p === param)).to.eq(param);
  });
});
