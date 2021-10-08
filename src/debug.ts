// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
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

// Do NOT turn on a debug feature in production. Debug features must only be used in non-prod environment.
const debugMode = process.env.FIREBASE_FUNCTIONS_DEBUG_MODE === 'true';
const supportedDebugFeatures = ['callableSkipTokenVerification'] as const;

type DebugFeature = typeof supportedDebugFeatures[number];
const camelToSnake = (str) =>
  str.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();
const debugFeatureValues: Record<
  DebugFeature,
  string
> = supportedDebugFeatures.reduce(
  (prev, cur) => ({
    ...prev,
    [cur]: process.env[`FIREBASE_FUNCTIONS_DEBUG_${camelToSnake(cur)}`],
  }),
  {} as Record<DebugFeature, string>
);

/* @internal */
export const isDebugFeatureEnabled = (feat: DebugFeature): boolean => {
  return debugMode && !!debugFeatureValues[feat];
};

/* @internal */
export const debugFeatureValue = (feat: DebugFeature): string | undefined => {
  if (!debugMode) return;
  return debugFeatureValues[feat];
};
