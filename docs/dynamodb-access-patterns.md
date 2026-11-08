# DynamoDB Access Patterns — NimbusFlow

Single table, on-demand billing. No GSI. All access is by partition key.

## Keys

| Attribute | Value                | Notes                      |
| --------- | -------------------- | -------------------------- |
| `PK`      | `EVENT#<eventId>`    | One partition per event    |
| `SK`      | `METADATA`           | The event row              |
| `SK`      | `AUDIT#<ts>#<stage>` | One row per pipeline stage |

## Access patterns

1. **Ingest writes the event** — `PutItem` with `PK=EVENT#<id>`, `SK=METADATA`, `status=received`, TTL = created_at + 7 days.
2. **Store writes enriched metadata + audit** — `PutItem`/`UpdateItem` on `METADATA` (status `stored`, enrichment map), plus `PutItem` per stage (`AUDIT#...`).
3. **Query reads everything for an event** — `Query` with `KeyConditionExpression: PK = :pk`. Returns the `METADATA` item and every `AUDIT#` row in one call; no separate `/audit` route and no GSI needed.
4. **Failure path** — Step Functions `Catch` updates `METADATA.status = failed` and publishes SNS; audit row records the failing stage.

## Why no GSI

- All reads are by `eventId`, so the base table PK is enough.
- Listing all events is intentionally not supported (would need a scan/GSI and is out of scope for a $0 demo).
- TTL on `METADATA` keeps the table under the 25 GB free cap; audit rows are small and expire with the event via the same TTL window.

## Cost notes

- On-demand mode: pay per request, $0 at idle.
- One `Query` per GET, one `PutItem` per stage. Keep payloads small (<= 16 KB) — there is no S3 in this stack.
