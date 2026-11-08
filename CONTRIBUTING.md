# Contributing to NimbusFlow

NimbusFlow is a small, locked-scope portfolio project (spec 1.1). Keep changes inside the scope in [`TODO.md`](./TODO.md) and [`README.md`](./README.md).

## Scope rules

- No EventBridge, DynamoDB Streams, X-Ray, S3, dashboards, load tests, custom domain, or second stack.
- SNS email only. One stack. CloudWatch log retention 7 days. Two alarms.
- Stay under Step Functions 4,000 transitions/month — demo by hand, never script a flood.

## Dev setup

```bash
npm install
npm run typecheck
npm run lint
npm run test
sam validate --lint
```

## Before opening a PR

1. `npm run format:check` (or `npm run format`).
2. `npm run lint` clean.
3. `npm run typecheck` clean.
4. `npm run test` green (24 tests).
5. `sam validate --lint` green.
6. Update `TODO.md` checkboxes and bump spec version in both `README.md` and `TODO.md` if a locked decision changes.

## Style

- TypeScript, Node 22 runtime, arm64. Match existing handler shape.
- Structured JSON logs with `eventId`, `stage`, `result`.
- One IAM role per function, no wildcard resource ARNs, no access keys in env.
- Small payloads (<= 16 KB); no S3.

## Deploy / teardown

```bash
sam build
sam deploy --guided   # first time
sam delete            # after demoing
```

Always `sam delete` after a demo window.
