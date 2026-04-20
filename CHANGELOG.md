- Validate `timeoutSeconds` per v2 trigger type (540s for events, 3600s for HTTPS/callable, 1800s for task queues) so misconfigured values fail at function-definition or manifest-extraction time instead of at deploy time. (#1874)

