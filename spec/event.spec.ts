// The MIT License (MIT)
//
// Copyright (c) 2015 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

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
