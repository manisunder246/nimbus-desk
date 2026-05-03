# nimbus-desk
Cloud Computing Project POC for lightweight Incident Management System

## Automated Tests

Integration test suite under `/tests` exercises 20 test cases against live AWS resources.

Run against deployed EC2:

    cd tests && npm test

Run against local backend:

    cd tests && npm run test:local

Results are persisted to `tests/results/latest.json` and `tests/results/latest.md`,
with timestamped archives under `tests/results/archive/`.
