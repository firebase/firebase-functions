- All V1 configuration (e.g. pubsub topics) can be set with params.
- String expressions can now be used in string interpolation with the `expr` tag. E.g.
  ```typescript
  const schedule = expr`every ${intervalParam} minutes`;
  ```
- Secret params now support a label and/or description.
