/**
 * GET /api/events/{id} — one Query on PK returns the METADATA item and every AUDIT row,
 * which is why there is no separate /audit route.
 */
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../shared/clients";
import { METADATA_SK, eventPk } from "../shared/constants";
import { requireEnv } from "../shared/env";
import { badRequest, json, notFound, serverError } from "../shared/http";
import { createLogger, errorFields } from "../shared/logger";
import { EVENT_ID_PATTERN } from "../shared/schema";

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const log = createLogger({ fn: "query", stage: "query" });
  const eventId = event.pathParameters?.["id"] ?? "";

  if (!EVENT_ID_PATTERN.test(eventId)) {
    log.warn("rejected lookup", { eventId, result: "invalid_id" });
    return badRequest("invalid_id", "Event id must look like 'evt_5f2a9c'");
  }

  try {
    const { Items = [] } = await ddb.send(
      new QueryCommand({
        TableName: requireEnv("EVENTS_TABLE_NAME"),
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": eventPk(eventId) },
      }),
    );

    const metadata = Items.find((item) => item["SK"] === METADATA_SK);
    if (!metadata) {
      log.info("lookup miss", { eventId, result: "not_found" });
      return notFound(`No event with id ${eventId}`);
    }

    const audit = Items.filter((item) => item["SK"] !== METADATA_SK)
      .map((item) => ({
        stage: item["stage"],
        result: item["result"],
        timestamp: item["timestamp"],
      }))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    log.info("lookup hit", { eventId, result: "ok", auditRows: audit.length });
    return json(200, {
      eventId,
      eventType: metadata["event_type"],
      status: metadata["status"],
      payload: metadata["payload"],
      createdAt: metadata["created_at"],
      enrichment: metadata["enrichment"],
      audit,
    });
  } catch (err) {
    log.error("lookup failed", { eventId, result: "error", ...errorFields(err) });
    return serverError();
  }
};
