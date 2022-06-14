// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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

import { pathParts } from './path';

/** https://cloud.google.com/eventarc/docs/path-patterns */

/** @hidden */
const WILDCARD_CAPTURE_REGEX = new RegExp('{[^/{}]+}', 'g');

/** @internal */
export function trimParam(param: string) {
  const paramNoBraces = param.slice(1, -1);
  if (paramNoBraces.includes('=')) {
    return paramNoBraces.slice(0, paramNoBraces.indexOf('='));
  }
  return paramNoBraces;
}

/** @hidden */
type SegmentName = 'segment' | 'single-capture' | 'multi-capture';

/** @hidden */
interface PathSegment {
  readonly name: SegmentName;
  readonly value: string;
  readonly trimmed: string;
  isSingleSegmentWildcard(): boolean;
  isMultiSegmentWildcard(): boolean;
}

/** @hidden */
class Segment implements PathSegment {
  readonly name = 'segment';
  readonly trimmed: string;
  constructor(readonly value: string) {
    this.trimmed = value;
  }
  isSingleSegmentWildcard(): boolean {
    return this.value.includes('*') && !this.isMultiSegmentWildcard();
  }
  isMultiSegmentWildcard(): boolean {
    return this.value.includes('**');
  }
}

/** @hidden */
class SingleCaptureSegment implements PathSegment {
  readonly name = 'single-capture';
  readonly trimmed: string;
  constructor(readonly value: string) {
    this.trimmed = trimParam(value);
  }
  isSingleSegmentWildcard(): boolean {
    return true;
  }
  isMultiSegmentWildcard(): boolean {
    return false;
  }
}

/** @hidden */
class MultiCaptureSegment implements PathSegment {
  readonly name = 'multi-capture';
  readonly trimmed: string;
  constructor(readonly value: string) {
    this.trimmed = trimParam(value);
  }
  isSingleSegmentWildcard(): boolean {
    return false;
  }
  isMultiSegmentWildcard(): boolean {
    return true;
  }
}

/**
 * Implements Eventarc's path pattern from the spec https://cloud.google.com/eventarc/docs/path-patterns
 * @internal
 */
export class PathPattern {
  private segments: PathSegment[];

  constructor(private raw: string) {
    this.segments = [];
    this.initPathSegments(raw);
  }

  /** @throws on validation error */
  static compile(rawPath: string) {
    const segments = pathParts(rawPath);

    if (segments.some((s) => s.length === 0)) {
      throw new Error('A segment cannot be empty.');
    }

    let mulitSegmentPattern = 0;
    for (const segment of segments) {
      if (this.isValidMultiSegment(segment)) {
        mulitSegmentPattern++;
      // } else if (isValidSegment(segment)) {
        
      } else {
        throw new Error('A segment must follow these rules - https://cloud.google.com/eventarc/docs/path-patterns');
      }
      


      if (mulitSegmentPattern > 1) {
        throw new Error('A path can only contain one Multi Segment Wildcard.');
      }
    }
  }

  private static isValidMultiSegment(segment: string): boolean {
    if (!segment.includes('**')) {
      return false;
    }

    if (segment.length === 2) {
      return true;
    }

    // if (segment.includes('='))
    return true;
  }

  getValue(): string {
    return this.raw;
  }

  // If false, we don't need to use pathPattern as our eventarc match type.
  hasWildcards(): boolean {
    return this.segments.some(
      (segment) =>
        segment.isSingleSegmentWildcard() || segment.isMultiSegmentWildcard()
    );
  }

  hasCaptures(): boolean {
    return this.segments.some(
      (segment) =>
        segment.name == 'single-capture' || segment.name === 'multi-capture'
    );
  }

  extractMatches(path: string): Record<string, string> {
    const matches: Record<string, string> = {};
    if (!this.hasCaptures()) {
      return matches;
    }
    const pathSegments = pathParts(path);
    let pathNdx = 0;

    for (
      let segmentNdx = 0;
      segmentNdx < this.segments.length && pathNdx < pathSegments.length;
      segmentNdx++
    ) {
      const segment = this.segments[segmentNdx];
      const remainingSegments = this.segments.length - 1 - segmentNdx;
      const nextPathNdx = pathSegments.length - remainingSegments;
      if (segment.name === 'single-capture') {
        matches[segment.trimmed] = pathSegments[pathNdx];
      } else if (segment.name === 'multi-capture') {
        matches[segment.trimmed] = pathSegments
          .slice(pathNdx, nextPathNdx)
          .join('/');
      }
      pathNdx = segment.isMultiSegmentWildcard() ? nextPathNdx : pathNdx + 1;
    }

    return matches;
  }

  private initPathSegments(raw: string) {
    const parts = pathParts(raw);
    for (const part of parts) {
      let segment: PathSegment;
      const capture = part.match(WILDCARD_CAPTURE_REGEX);
      if (capture && capture.length === 1) {
        segment = part.includes('**')
          ? new MultiCaptureSegment(part)
          : new SingleCaptureSegment(part);
      } else {
        segment = new Segment(part);
      }
      this.segments.push(segment);
    }
  }
}
