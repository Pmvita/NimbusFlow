import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { handler } from "../../functions/query/handler";
import { apiEvent, parseBody } from "../helpers/builders";

const ddbMock = mockClient(DynamoDBDocumentClient);

const metadataItem = {
  PK: "EVENT#evt_5f2a9c",
  SK: "METADATA",
  event_type: "order.created",
  status: "stored",
  payload: { orderId: "ord_8821" },
  created_at: 1789137130,
};

describe("query handler", () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env["EVENTS_TABLE_NAME"] = "nimbusflow-events";
  });

  it("returns metadata with the audit trail in stage order", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          PK: metadataItem.PK,
          SK: "AUDIT#1789137133#store",
          stage: "store",
          result: "ok",
          timestamp: 1789137133,
        },
        metadataItem,
        {
          PK: metadataItem.PK,
          SK: "AUDIT#1789137131#validate",
          stage: "validate",
          result: "ok",
          timestamp: 1789137131,
        },
      ],
    });

    const result = await handler(apiEvent({ pathParameters: { id: "evt_5f2a9c" } }));
    const body = parseBody<{ status: string; audit: Array<{ stage: string }> }>(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.status).toBe("stored");
    expect(body.audit.map((row) => row.stage)).toEqual(["validate", "store"]);
  });

  it("returns 404 when the partition has no metadata item", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handler(apiEvent({ pathParameters: { id: "evt_5f2a9c" } }));

    expect(result.statusCode).toBe(404);
  });

  it("returns 400 for a malformed id and never queries the table", async () => {
    const result = await handler(apiEvent({ pathParameters: { id: "../../etc/passwd" } }));

    expect(result.statusCode).toBe(400);
    expect(parseBody(result.body)["error"]).toBe("invalid_id");
    expect(ddbMock.commandCalls(QueryCommand)).toHaveLength(0);
  });
});
