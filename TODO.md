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

- [ ] Install AWS SAM CLI + Docker
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
- [x] SNS topic + your email subscription
- [ ] Confirm a test email before wiring alarms

---

## 🧭 Step Functions

- [x] ASL: Validate → Enrich → Store → Notify
- [x] Retry + backoff on Store (transient DynamoDB)
- [x] `Catch` on every state → mark `failed` + SNS
- [ ] Run **a few** executions in the console — not a loop

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

---

## 🧪 Testing & QA

- [x] Unit tests per handler
- [ ] One integration path: POST → wait → GET (script ready: `npm run smoke -- <api-url>`)
- [ ] Failure checks: invalid POST → 400; force a process failure → failed status + email

---

## 🚀 Deployment

- [ ] `sam build` + `sam deploy --guided`
- [ ] Save `samconfig.toml`
- [ ] Smoke-test: one POST, one GET, one bad POST
- [ ] Document rollback (`sam delete` / CloudFormation rollback)
- [ ] After the demo: `sam delete`

---

## 📄 Documentation

- [x] README.md (architecture, $0 rules, API, IAM)
- [x] TODO.md (this file — complete build list)
- [ ] OpenAPI for POST + GET
- [ ] DynamoDB access-pattern note (PK/SK)
- [ ] CONTRIBUTING.md

---

_Spec 1.1 — last updated: 2026-09-07_
