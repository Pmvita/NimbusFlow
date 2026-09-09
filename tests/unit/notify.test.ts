import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { handler } from "../../functions/notify/handler";
import type { StoredEvent } from "../../functions/shared/schema";

const snsMock = mockClient(SNSClient);

const stored: StoredEvent = {
  eventId: "evt_5f2a9c",
  eventType: "order.created",
  payload: { orderId: "ord_8821" },
  validatedAt: "2026-09-07T14:32:11.000Z",
  storedAt: "2026-09-07T14:32:13.000Z",
  enrichment: {
    category: "order",
    action: "created",
    payloadKeyCount: 1,
    payloadSizeBytes: 24,
    region: "us-east-1",
    enrichedAt: "2026-09-07T14:32:12.000Z",
  },
};

describe("notify handler", () => {
  beforeEach(() => {
    snsMock.reset();
    process.env["ALERT_TOPIC_ARN"] = "arn:aws:sns:us-east-1:123456789012:nimbusflow-alerts";
  });

  it("publishes a summary to the topic", async () => {
    snsMock.on(PublishCommand).resolves({ MessageId: "sns-1" });

    const result = await handler(stored);
    const input = snsMock.commandCalls(PublishCommand)[0]?.args[0].input;

    expect(input?.TopicArn).toBe("arn:aws:sns:us-east-1:123456789012:nimbusflow-alerts");
    expect(input?.Subject).toContain("order.created");
    expect(JSON.parse(String(input?.Message))).toMatchObject({
      eventId: "evt_5f2a9c",
      status: "stored",
    });
    expect(result.notifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("propagates a publish failure so the workflow can catch it", async () => {
    snsMock.on(PublishCommand).rejects(new Error("throttled"));

    await expect(handler(stored)).rejects.toThrow("throttled");
  });
});
