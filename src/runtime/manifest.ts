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
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/**
 * An definition of a function as appears in the Manifest.
 */
export interface ManifestEndpoint {
  entryPoint?: string;
  region?: string[];
  platform?: string;
  availableMemoryMb?: number;
  maxInstances?: number;
  minInstances?: number;
  concurrency?: number;
  serviceAccountEmail?: string;
  timeoutSeconds?: number;
  vpc?: {
    connector: string;
    egressSettings?: string;
  };
  labels?: Record<string, string>;
  ingressSettings?: string;
  environmentVariables?: Record<string, string>;
  secretEnvironmentVariables?: Array<{ key: string; secret?: string }>;

  httpsTrigger?: {
    invoker?: string[];
  };

  callableTrigger?: {};

  eventTrigger?: {
    eventFilters: Record<string, string>;
    eventFilterPathPatterns?: Record<string, string>;
    channel?: string;
    eventType: string;
    retry: boolean;
    region?: string;
    serviceAccountEmail?: string;
  };

  scheduleTrigger?: {
    schedule?: string;
    timezone?: string;
    retryConfig?: {
      retryCount?: number;
      maxRetryDuration?: string;
      minBackoffDuration?: string;
      maxBackoffDuration?: string;
      maxDoublings?: number;
    };
  };
}

export interface ManifestRequiredAPI {
  api: string;
  reason: string;
}

/**
 * An definition of a function deployment as appears in the Manifest.
 */
export interface ManifestStack {
  specVersion: 'v1alpha1';
  requiredAPIs: ManifestRequiredAPI[];
  endpoints: Record<string, ManifestEndpoint>;
}
