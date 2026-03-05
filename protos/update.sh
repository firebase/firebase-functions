#!/bin/bash

# The MIT License (MIT)
#
# Copyright (c) 2023 Firebase
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

# vars
PROTOS_DIR="$(pwd)"
WORK_DIR=$(mktemp -d)

# deletes the temp directory on exit
function cleanup {
  rm -rf "$WORK_DIR"
  echo "Deleted temp working directory $WORK_DIR"
  rm -rf "${PROTOS_DIR}/data.proto" "${PROTOS_DIR}/any.proto" "${PROTOS_DIR}/google"
  echo "Deleted copied protos"
}

# register the cleanup function to be called on the EXIT signal
trap cleanup EXIT

# enter working directory
pushd "$WORK_DIR"

git clone --depth 1 https://github.com/googleapis/google-cloudevents.git
git clone --depth 1 https://github.com/googleapis/googleapis.git
git clone --depth 1 https://github.com/google/protobuf.git

# make dirs
mkdir -p "${PROTOS_DIR}/google/type"

# copy protos
cp google-cloudevents/proto/google/events/cloud/firestore/v1/data.proto \
  "${PROTOS_DIR}/"

cp protobuf/src/google/protobuf/any.proto \
  "${PROTOS_DIR}/"

cp protobuf/src/google/protobuf/struct.proto \
  "${PROTOS_DIR}/google/"

cp protobuf/src/google/protobuf/timestamp.proto \
  "${PROTOS_DIR}/google/"

cp googleapis/google/type/latlng.proto \
  "${PROTOS_DIR}/google/type/"

popd

PBJS="npx pbjs"
PBTS="npx pbts"

# Generate CommonJS
${PBJS} -t static-module -w commonjs -o compiledFirestore.js \
  data.proto any.proto

# Generate ESM
${PBJS} -t static-module -w es6 -o compiledFirestore.mjs \
  data.proto any.proto

# Generate Types
${PBTS} -o compiledFirestore.d.ts compiledFirestore.js
#
# Fix imports for Node ESM in the generated .mjs file.
# See: https://github.com/protobufjs/protobuf.js/issues/1929
if [[ "$OSTYPE" == "darwin"* ]]; then
  # 1. Append .js extension: Node ESM requires full paths for subpath imports not in 'exports'.
  sed -i '' 's|protobufjs/minimal|protobufjs/minimal.js|g' compiledFirestore.mjs
  # 2. Use default import: protobufjs is CJS. 'import * as' creates a namespace where
  #    module.exports is under .default. Generated code expects $protobuf to be module.exports directly.
  sed -i '' 's|import \* as \$protobuf|import \$protobuf|g' compiledFirestore.mjs
else
  # 1. Append .js extension.
  sed -i 's|protobufjs/minimal|protobufjs/minimal.js|g' compiledFirestore.mjs
  # 2. Use default import.
  sed -i 's|import \* as \$protobuf|import \$protobuf|g' compiledFirestore.mjs
fi

