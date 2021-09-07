import { expect } from 'chai';
import { convertInvoker } from '../../src/common/encoding';

describe('convertInvoker', () => {
  it('should raise an error on empty array', () => {
    expect(() => convertInvoker([])).to.throw;
  });

  it('should raise an error on empty string', () => {
    expect(() => convertInvoker('')).to.throw;
  });

  it('should raise an error on empty string with service accounts', () => {
    expect(() => convertInvoker(['service-account@', ''])).to.throw;
  });

  it('should raise an error on mixing public and service accounts', () => {
    expect(() => convertInvoker(['public', 'service-account@'])).to.throw;
  });

  it('should raise an error on mixing private and service accounts', () => {
    expect(() => convertInvoker(['private', 'service-account@'])).to.throw;
  });

  it('should return the correct public invoker', () => {
    const invoker = convertInvoker('public');

    expect(invoker).to.deep.equal(['public']);
  });

  it('should return the correct private invoker', () => {
    const invoker = convertInvoker('private');

    expect(invoker).to.deep.equal(['private']);
  });

  it('should return the correct scalar invoker', () => {
    const invoker = convertInvoker('service-account@');

    expect(invoker).to.deep.equal(['service-account@']);
  });

  it('should return the correct array invoker', () => {
    const invoker = convertInvoker(['service-account1@', 'service-account2@']);

    expect(invoker).to.deep.equal(['service-account1@', 'service-account2@']);
  });
});
