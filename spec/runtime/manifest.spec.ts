import { stackToWire, ManifestStack } from '../../src/runtime/manifest';
import { expect } from 'chai';
import * as params from '../../src/v2/params';

const intParam = params.defineInt('asdf', { default: 11 });

describe('stackToWire', () => {
  afterEach(() => {
    params.clearParams();
  });

  it('converts Expression types in endpoint options to CEL', () => {
    const stack: ManifestStack = {
      endpoints: {
        v2http: {
          platform: 'gcfv2',
          entryPoint: 'v2http',
          labels: {},
          httpsTrigger: {},
          concurrency: intParam.expr(),
          maxInstances: intParam.equals(24).then(-1, 1),
        },
      },
      requiredAPIs: [],
      specVersion: 'v1alpha1',
    };
    const expected = {
      endpoints: {
        v2http: {
          platform: 'gcfv2',
          entryPoint: 'v2http',
          labels: {},
          httpsTrigger: {},
          concurrency: '{{ asdf }}',
          maxInstances: '{{ asdf == 24 ? -1 : 1 }}',
        },
      },
      requiredAPIs: [],
      specVersion: 'v1alpha1',
    };
    expect(stackToWire(stack)).to.deep.equal(expected);
  });
});
