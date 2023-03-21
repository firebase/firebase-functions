# Generate compiled ProtoBuf

## Step 1

### Grab the protos

Firestore DocumentEventData - https://github.com/googleapis/google-cloudevents/blob/main/proto/google/events/cloud/firestore/v1/data.proto

Any - https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/any.proto

Struct - https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/struct.proto

Timestamp - https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/timestamp.proto

Latlng - https://github.com/googleapis/googleapis/blob/master/google/type/latlng.proto

## Step 2

### Directory structure

data.proto
any.proto
google/
struct.proto
timestamp.proto
type/
latlng.proto

## Step 3

### Run the protobufjs cli to generate

```
npx pbjs -t static-module -w commonjs -o compiled.js data.proto any.proto google/struct.proto google/timestamp.proto google/type/latlng.proto
npx pbts -o compiled.d.ts compiled.js
```

https://github.com/protobufjs/protobuf.js/tree/master/cli#pbts-for-typescript
