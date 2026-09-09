import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { handler } from "../../functions/ingest/handler";
import { apiEvent, awsError, parseBody } from "../helpers/builders";

const ddbMock = mockClient(DynamoDBDocumentClient);
const sqsMock = mockClient(SQSClient);

const validBody = JSON.stringify({
  eventType: "order.created",
  payload: { orderId: "ord_8821", amount: 249 },
});

describe("ingest handler", () => {
  beforeEach(() => {
    ddbMock.reset();
    sqsMock.reset();
    process.env["EVENTS_TABLE_NAME"] = "nimbusflow-events";
    process.env["EVENTS_QUEUE_URL"] = "https://sqs.us-east-1.amazonaws.com/123456789012/events";
  });

  it("accepts a valid event, records it and queues it", async () => {
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).resolves({ MessageId: "sqs-1" });

    const result = await handler(apiEvent({ body: validBody }));
    const body = parseBody<{ eventId: string; status: string; acceptedAt: string }>(result.body);

    expect(result.statusCode).toBe(202);
    expect(body.status).toBe("received");
    expect(body.eventId).toMatch(/^evt_[0-9a-f]{12}$/);
    expect(body.acceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const put = ddbMock.commandCalls(PutCommand)[0]?.args[0].input;
    expect(put?.Item).toMatchObject({
      PK: `EVENT#${body.eventId}`,
      SK: "METADATA",
      status: "received",
      event_type: "order.created",
    });
    expect(put?.Item?.["ttl"]).toBeGreaterThan(put?.Item?.["created_at"]);

    const message = sqsMock.commandCalls(SendMessageCommand)[0]?.args[0].input;
    expect(JSON.parse(String(message?.MessageBody))).toEqual({
      eventId: body.eventId,
      eventType: "order.created",
      payload: { orderId: "ord_8821", amount: 249 },
    });
  });

  it("returns 400 for a body that is not JSON", async () => {
    const result = await handler(apiEvent({ body: "not json" }));

    expect(result.statusCode).toBe(400);
    expect(parseBody(result.body)["error"]).toBe("invalid_json");
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(0);
    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
  });

  it("returns 400 when the schema fails and never touches the queue", async () => {
    const result = await handler(
      apiEvent({ body: JSON.stringify({ eventType: "NotValid", payload: {} }) }),
    );

    expect(result.statusCode).toBe(400);
    expect(parseBody(result.body)["error"]).toBe("validation_failed");
    expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(0);
  });

  it("returns 500 without leaking details when SQS rejects", async () => {
    ddbMock.on(PutCommand).resolves({});
    sqsMock.on(SendMessageCommand).rejects(awsError("KmsAccessDenied"));

    const result = await handler(apiEvent({ body: validBody }));

    expect(result.statusCode).toBe(500);
    expect(parseBody(result.body)["error"]).toBe("internal_error");
    expect(JSON.stringify(parseBody(result.body))).not.toContain("KmsAccessDenied");
  });
});
