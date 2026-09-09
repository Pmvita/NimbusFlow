/**
 * POST /api/events — validate the body, record it as `received`, hand it to SQS.
 * Returns 202 as soon as the message is queued; the workflow runs afterwards.
 */
import { randomBytes } from "node:crypto";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { ddb, sqs } from "../shared/clients";
import { METADATA_SK, TTL_SECONDS, eventPk, nowSeconds } from "../shared/constants";
import { requireEnv } from "../shared/env";
import { badRequest, json, serverError } from "../shared/http";
import { createLogger, errorFields } from "../shared/logger";
import { formatIssues, ingestRequestSchema } from "../shared/schema";

const newEventId = (): string => `evt_${randomBytes(6).toString("hex")}`;

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const log = createLogger({ fn: "ingest", stage: "ingest" });

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(event.body ?? "");
  } catch {
    log.warn("rejected request", { result: "invalid_json" });
    return badRequest("invalid_json", "Request body must be valid JSON");
  }

  const result = ingestRequestSchema.safeParse(parsedBody);
  if (!result.success) {
    const details = formatIssues(result.error);
    log.warn("rejected request", { result: "validation_failed", details });
    return badRequest("validation_failed", "Request body failed schema validation", details);
  }

  const { eventType, payload } = result.data;
  const eventId = newEventId();
  const createdAt = nowSeconds();

  try {
    await ddb.send(
      new PutCommand({
        TableName: requireEnv("EVENTS_TABLE_NAME"),
        Item: {
          PK: eventPk(eventId),
          SK: METADATA_SK,
          event_type: eventType,
          status: "received",
          payload,
          created_at: createdAt,
          ttl: createdAt + TTL_SECONDS,
        },
      }),
    );

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: requireEnv("EVENTS_QUEUE_URL"),
        MessageBody: JSON.stringify({ eventId, eventType, payload }),
      }),
    );
  } catch (err) {
    log.error("ingest failed", { eventId, result: "error", ...errorFields(err) });
    return serverError();
  }

  log.info("event accepted", { eventId, eventType, result: "accepted" });
  return json(202, {
    eventId,
    status: "received",
    acceptedAt: new Date(createdAt * 1000).toISOString(),
  });
};
