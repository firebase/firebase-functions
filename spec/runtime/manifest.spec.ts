import { expect } from 'chai';
import * as manifest from '../../src/runtime/manifest';
import { ParamExpression, ParamRef } from '../../src/v2';

describe('toWireStack', () => {
  it('does not affect stacks with only literal fields', () => {
    const basicStack: manifest.ManifestStack = {
      endpoints: {
        v1http: {
          platform: 'gcfv1',
          entryPoint: 'v1http',
          httpsTrigger: {},
        },
        v2http: {
          platform: 'gcfv2',
          entryPoint: 'v2http',
          labels: {},
          httpsTrigger: {},
        },
      },
      requiredAPIs: [],
      specVersion: 'v1alpha1',
    };
    expect(manifest.toWireStack(basicStack)).to.be.deep.equal(basicStack);
  });

  it('converts Expression properties of the endpoints into CEL literals', () => {
    const withExpressions: manifest.ManifestStack = {
      endpoints: {
        v1http: {
          platform: 'gcfv1',
          entryPoint: 'v1http',
          httpsTrigger: {},
          availableMemoryMb: new ParamExpression<number>(new ParamRef("MEMORY")),
        },
        v2http: {
          platform: 'gcfv2',
          entryPoint: 'v2http',
          labels: {},
          httpsTrigger: {},
          availableMemoryMb: new ParamExpression<number>(new ParamRef("MEMORY")),
        },
      },
      requiredAPIs: [],
      specVersion: 'v1alpha1',
    };
    const expected:manifest.WireStack = {
      endpoints: {
        v1http: {
          platform: 'gcfv1',
          entryPoint: 'v1http',
          httpsTrigger: {},
          availableMemoryMb: '{{ params.MEMORY }}',
        },
        v2http: {
          platform: 'gcfv2',
          entryPoint: 'v2http',
          labels: {},
          httpsTrigger: {},
          availableMemoryMb: '{{ params.MEMORY }}',
        },
      },
      requiredAPIs: [],
      specVersion: 'v1alpha1',
    };
    expect(manifest.toWireStack(withExpressions)).to.be.deep.equal(expected);
  });
})