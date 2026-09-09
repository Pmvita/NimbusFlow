import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from "../../functions/store/handler";
import type { EnrichedEvent } from "../../functions/shared/schema";
import { awsError } from "../helpers/builders";

const ddbMock = mockClient(DynamoDBDocumentClient);

const enriched: EnrichedEvent = {
  eventId: "evt_5f2a9c",
  eventType: "order.created",
  payload: { orderId: "ord_8821" },
  validatedAt: "2026-09-07T14:32:11.000Z",
  enrichment: {
    category: "order",
    action: "created",
    payloadKeyCount: 1,
    payloadSizeBytes: 24,
    region: "us-east-1",
    enrichedAt: "2026-09-07T14:32:12.000Z",
  },
};

describe("store handler", () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env["EVENTS_TABLE_NAME"] = "nimbusflow-events";
  });

  it("marks the event stored and writes one audit row per stage", async () => {
    ddbMock.on(UpdateCommand).resolves({});
    ddbMock.on(PutCommand).resolves({});

    const result = await handler(enriched);

    expect(result.storedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const update = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
    expect(update?.Key).toEqual({ PK: "EVENT#evt_5f2a9c", SK: "METADATA" });
    expect(update?.ExpressionAttributeValues?.[":status"]).toBe("stored");

    const stages = ddbMock
      .commandCalls(PutCommand)
      .map((call) => call.args[0].input.Item?.["stage"]);
    expect(stages).toEqual(["validate", "enrich", "store"]);

    const auditKey = ddbMock.commandCalls(PutCommand)[0]?.args[0].input.Item;
    expect(auditKey?.["PK"]).toBe("EVENT#evt_5f2a9c");
    expect(String(auditKey?.["SK"])).toMatch(/^AUDIT#\d+#validate$/);
  });

  it("converts a throttle into the retryable error the workflow matches on", async () => {
    ddbMock.on(UpdateCommand).rejects(awsError("ProvisionedThroughputExceededException"));

    await expect(handler(enriched)).rejects.toMatchObject({ name: "DynamoDbTransientError" });
  });

  it("lets a non-transient failure through unchanged", async () => {
    ddbMock.on(UpdateCommand).rejects(awsError("ValidationException"));

    await expect(handler(enriched)).rejects.toMatchObject({ name: "ValidationException" });
  });
});
