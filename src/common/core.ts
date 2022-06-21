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

/**
 * The Functions interface for events that change state, such as
 * Realtime Database or Cloud Firestore `onWrite` and `onUpdate`.
 *
 * For more information about the format used to construct `Change` objects, see
 * [`cloud-functions.ChangeJson`](/docs/reference/functions/cloud_functions_.changejson).
 *
 */
export class Change<T> {
  constructor(public before: T, public after: T) {}
}

/**
 * `ChangeJson` is the JSON format used to construct a Change object.
 */
export interface ChangeJson {
  /**
   * Key-value pairs representing state of data after the change.
   */
  after?: any;
  /**
   * Key-value pairs representing state of data before the change. If
   * `fieldMask` is set, then only fields that changed are present in `before`.
   */
  before?: any;
  /**
   * @hidden
   * Comma-separated string that represents names of fields that changed.
   */
  fieldMask?: string;
}

export namespace Change {
  /** @hidden */
  function reinterpretCast<T>(x: any) {
    return x as T;
  }

  /**
   * @hidden
   * Factory method for creating a Change from a `before` object and an `after`
   * object.
   */
  export function fromObjects<T>(before: T, after: T) {
    return new Change(before, after);
  }

  /**
   * @hidden
   * Factory method for creating a Change from a JSON and an optional customizer
   * function to be applied to both the `before` and the `after` fields.
   */
  export function fromJSON<T>(
    json: ChangeJson,
    customizer: (x: any) => T = reinterpretCast
  ): Change<T> {
    let before = { ...json.before };
    if (json.fieldMask) {
      before = applyFieldMask(before, json.after, json.fieldMask);
    }

    return Change.fromObjects(
      customizer(before || {}),
      customizer(json.after || {})
    );
  }

  /** @hidden */
  export function applyFieldMask(
    sparseBefore: any,
    after: any,
    fieldMask: string
  ) {
    const before = { ...after };
    const masks = fieldMask.split(',');

    for (const mask of masks) {
      const parts = mask.split('.');
      const head = parts[0];
      const tail = parts.slice(1).join('.');
      if (parts.length > 1) {
        before[head] = applyFieldMask(sparseBefore?.[head], after[head], tail);
        continue;
      }
      const val = sparseBefore?.[head];
      if (typeof val === 'undefined') {
        delete before[mask];
      } else {
        before[mask] = val;
      }
    }

    return before;
  }
}
