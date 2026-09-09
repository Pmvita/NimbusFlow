/**
 * StoreRecord: promote the METADATA item to `stored` and append one audit row per stage
 * completed so far. Throttles and 5xx become DynamoDbTransientError, which the state
 * machine retries with backoff.
 */
import { PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../shared/clients";
import {
  METADATA_SK,
  TTL_SECONDS,
  auditSk,
  eventPk,
  nowSeconds,
  type PipelineStage,
} from "../shared/constants";
import { requireEnv } from "../shared/env";
import { rethrowDynamoDbError } from "../shared/errors";
import { createLogger } from "../shared/logger";
import type { EnrichedEvent, StoredEvent } from "../shared/schema";

const auditItem = (
  tableName: string,
  eventId: string,
  stage: PipelineStage,
  timestamp: number,
  result: string,
) =>
  new PutCommand({
    TableName: tableName,
    Item: {
      PK: eventPk(eventId),
      SK: auditSk(timestamp, stage),
      stage,
      result,
      timestamp,
      ttl: timestamp + TTL_SECONDS,
    },
  });

export const handler = async (input: EnrichedEvent): Promise<StoredEvent> => {
  const log = createLogger({ fn: "store", stage: "store" });
  const tableName = requireEnv("EVENTS_TABLE_NAME");
  const timestamp = nowSeconds();

  try {
    await ddb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: eventPk(input.eventId), SK: METADATA_SK },
        UpdateExpression:
          "SET #status = :status, enrichment = :enrichment, validated_at = :validatedAt, updated_at = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "stored",
          ":enrichment": input.enrichment,
          ":validatedAt": input.validatedAt,
          ":updatedAt": timestamp,
        },
      }),
    );

    // Sequential on purpose: the audit rows are ordered by stage and the volume is tiny.
    await ddb.send(auditItem(tableName, input.eventId, "validate", timestamp, "ok"));
    await ddb.send(auditItem(tableName, input.eventId, "enrich", timestamp, "ok"));
    await ddb.send(auditItem(tableName, input.eventId, "store", timestamp, "ok"));
  } catch (err) {
    log.error("store failed", { eventId: input.eventId, result: "error" });
    rethrowDynamoDbError(err);
  }

  log.info("stored", { eventId: input.eventId, result: "ok" });
  return { ...input, storedAt: new Date(timestamp * 1000).toISOString() };
};
