# ✅ NimbusFlow — TODO

**Spec version:** 1.1 — 2026-09-07 (same version as [`README.md`](./README.md))

This checklist **is** the whole project. When every box is checked, the resume piece is finished. README = design; this file = build list. If you change a locked decision, bump the version in **both** files.

**Locked scope:**

- Path: API Gateway HTTP API → Ingest → SQS → Process → Step Functions → DynamoDB → SNS
- Invalid body = `400` at ingest (not DLQ)
- DLQ = SQS poison messages after retries only
- No EventBridge, DynamoDB Streams, X-Ray, S3, dashboards, load tests, custom domain, or second stack
- SNS **email** only
- One stack, CloudWatch log retention **7 days**, **two** alarms
- IaC: AWS SAM
- Stay under Step Functions **4,000 transitions/month** — demo by hand

---

## 💰 Cost guard (do this first)

- [ ] Create a **$1** AWS Budget + email alert
- [ ] Plan to `sam delete` after each demo window

---

## 🏗️ Project Setup

- [ ] Install AWS SAM CLI + Docker (not present on this machine at last polish)
- [x] Initialize SAM + TypeScript project
- [x] ESLint + Prettier
- [x] Add MIT `LICENSE`
- [x] Sample events under `events/`
- [x] PR CI: `sam validate` + unit tests

---

## 🌐 API Layer

- [x] HTTP API in `template.yaml` (default AWS URL, no custom domain)
- [x] `POST /api/events` → Ingest
- [x] `GET /api/events/{id}` → Query

---

## λ Lambda Functions

- [x] `ingest` — Zod/JSON schema; valid → `PutItem` (`received`) + `SendMessage`; invalid → `400`
- [x] `process` — SQS event-source mapping; `StartExecution`
- [x] `validate` — business rules
- [x] `enrich` — add derived fields only (no paid external APIs)
- [x] `store` — write/update `METADATA` + `AUDIT#` items
- [x] `notify` — `sns:Publish` on success
- [x] `query` — Query `PK = EVENT#<id>`, return metadata + audit
- [x] Structured JSON logs on every function (`eventId`, `stage`, `result`)

---

## 📬 Messaging

- [x] SQS queue (ingest → process)
- [x] SQS DLQ + redrive (max receive count, e.g. 3)
- [x] SNS topic defined in template (email from deploy parameter)
- [ ] Confirm a test email before wiring alarms (needs live deploy)

---

## 🧭 Step Functions

- [x] ASL: Validate → Enrich → Store → Notify
- [x] Retry + backoff on Store (transient DynamoDB)
- [x] `Catch` on every state → mark `failed` + SNS
- [ ] Run **a few** executions in the console — not a loop (needs live deploy)

---

## 🗄️ Data Layer

- [x] Single-table design (`EVENT#` / `METADATA` + `AUDIT#`)
- [x] On-demand billing mode
- [x] TTL on metadata
- [x] Payloads stay small (no S3)

---

## 🔑 IAM

- [x] One role per function, actions listed in the README table
- [x] No `*` resource ARNs (one exception: the log-delivery actions Step Functions logging requires do not accept an ARN)
- [x] No access keys in env vars

---

## 🔬 Observability

- [x] Log groups with **7-day** retention
- [x] Alarm: Lambda Errors > 0 → SNS
- [x] Alarm: DLQ visible messages > 0 → SNS
- [x] Explicitly **no** EventBridge / X-Ray (see `template.yaml` comments)

---

## 🧪 Testing & QA

- [x] Unit tests per handler (`npm test` — 24 passing)
- [x] Smoke script ready: `npm run smoke -- <api-url>` (`tests/integration/smoke.mjs`)
- [ ] One live integration path: POST → wait → GET (requires deployed API URL)
- [ ] Failure checks on live stack: invalid POST → 400; force a process failure → failed status + email

---

## 🚀 Deployment

- [x] `samconfig.toml` committed (stack name `nimbusflow`, cached build, lint validate)
- [ ] Replace placeholder `NotificationEmail=\"you@example.com\"` in `samconfig.toml` with your real address before deploy
- [ ] Install AWS CLI + SAM CLI; configure credentials (`aws configure` or SSO)
- [ ] `sam build` + `sam validate --lint` (blocked here: `sam` / `aws` not on PATH)
- [ ] `sam deploy --guided` (first time) or `sam deploy` after `samconfig.toml` is real
- [ ] Smoke-test: `npm run smoke -- https://<api-id>.execute-api.<region>.amazonaws.com`
- [ ] Document rollback (`sam delete` / CloudFormation rollback) — see README Deployment
- [ ] After the demo: `sam delete`

### Exact deploy steps (when AWS + SAM are available)

1. Create a **$1** AWS Budget with your email.
2. Edit `samconfig.toml` → set `NotificationEmail` to that email (not `you@example.com`).
3. `npm install`
4. `sam validate --lint`
5. `sam build`
6. `sam deploy --guided` (first run) — accept prompts; confirm the SNS subscription email.
7. Copy the HTTP API URL from stack outputs.
8. `npm run smoke -- <api-url>`
9. When finished demoing: `sam delete`

---

## 📄 Documentation

- [x] README.md (architecture, $0 rules, API, IAM — no EventBridge/X-Ray claims)
- [x] TODO.md (this file — honest deploy status)
- [x] OpenAPI for POST + GET (`docs/openapi.yaml`)
- [x] DynamoDB access-pattern note (PK/SK) (`docs/dynamodb-access-patterns.md`)
- [x] CONTRIBUTING.md
- [x] Smoke script usage documented in README

---

_Spec 1.1 — last updated: 2026-11-08_
