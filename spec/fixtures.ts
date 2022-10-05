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
import { ManifestEndpoint } from "../src/runtime/manifest";
import { RESET_VALUE } from "../src/common/options";

export const MINIMAL_V2_ENDPOINT: ManifestEndpoint = {
  availableMemoryMb: RESET_VALUE,
  concurrency: RESET_VALUE,
  ingressSettings: RESET_VALUE,
  maxInstances: RESET_VALUE,
  minInstances: RESET_VALUE,
  serviceAccountEmail: RESET_VALUE,
  timeoutSeconds: RESET_VALUE,
  vpc: RESET_VALUE,
};

export const MINIMAL_V1_ENDPOINT: ManifestEndpoint = {
  availableMemoryMb: RESET_VALUE,
  ingressSettings: RESET_VALUE,
  maxInstances: RESET_VALUE,
  minInstances: RESET_VALUE,
  serviceAccountEmail: RESET_VALUE,
  timeoutSeconds: RESET_VALUE,
  vpc: {
    connector: RESET_VALUE,
    egressSettings: RESET_VALUE,
  },
};

export const FULL_ENDPOINT: ManifestEndpoint = {
  region: ["us-west1"],
  availableMemoryMb: 512,
  timeoutSeconds: 60,
  minInstances: 1,
  maxInstances: 3,
  concurrency: 20,
  vpc: {
    connector: "aConnector",
    egressSettings: "ALL_TRAFFIC",
  },
  serviceAccountEmail: "root@",
  ingressSettings: "ALLOW_ALL",
  cpu: "gcf_gen1",
  labels: {
    hello: "world",
  },
  secretEnvironmentVariables: [{ key: "MY_SECRET" }],
};
