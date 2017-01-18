import { Event } from '../src/event';
import { expect } from 'chai';

describe('Event<T>', () => {

  it('can be constructed with a minimal payload', () => {
    const event = new Event({
      resource: 'projects/project1',
      path: '/path',
    }, undefined);
    expect(event.resource).to.equal('projects/project1');
    expect(event.path).to.equal('/path');
    expect(event.uid).to.be.undefined;
    expect(event.data).to.be.undefined;
  });

  it('exposes optional forwarded params', () => {
    const event = new Event<Number>({
      resource: 'projects/project1',
      path: '/path',
      params: { param: 'value' },
    }, 42);
    expect(event.data).to.equal(42);
    expect(event.params).to.deep.equal({ param: 'value' });
  });
});
