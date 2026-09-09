import { beforeEach, describe, expect, it } from "vitest";
import { handler } from "../../functions/enrich/handler";
import type { ValidatedEvent } from "../../functions/shared/schema";

const validated: ValidatedEvent = {
  eventId: "evt_5f2a9c",
  eventType: "order.created",
  payload: { orderId: "ord_8821", amount: 249 },
  validatedAt: "2026-09-07T14:32:11.000Z",
};

describe("enrich handler", () => {
  beforeEach(() => {
    process.env["AWS_REGION"] = "us-east-1";
  });

  it("derives fields without calling anything external", async () => {
    const result = await handler(validated);

    expect(result.enrichment).toMatchObject({
      category: "order",
      action: "created",
      payloadKeyCount: 2,
      region: "us-east-1",
    });
    expect(result.enrichment.payloadSizeBytes).toBe(
      Buffer.byteLength(JSON.stringify(validated.payload), "utf8"),
    );
  });

  it("keeps multi-part actions intact", async () => {
    const result = await handler({ ...validated, eventType: "order.payment.captured" });

    expect(result.enrichment.category).toBe("order");
    expect(result.enrichment.action).toBe("payment.captured");
  });

  it("throws when the event type has no action segment", async () => {
    await expect(handler({ ...validated, eventType: "order" })).rejects.toMatchObject({
      name: "EnrichmentError",
    });
  });
});
