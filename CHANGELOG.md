- All V1 configuration (e.g. pubsub topics) can be set with params. (#1820)
- String expressions can now be used in string interpolation with the `expr` tag. (#1820) E.g.
  ```typescript
  const schedule = expr`every ${intervalParam} minutes`;
  ```
- Secret params now support a label and/or description. (#1820)
- Add support for VPC direct connect (network interfaces) (#1823)
