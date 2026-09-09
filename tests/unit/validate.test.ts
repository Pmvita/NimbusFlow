import { describe, expect, it } from "vitest";
import { handler } from "../../functions/validate/handler";

const message = {
  eventId: "evt_5f2a9c",
  eventType: "order.created",
  payload: { orderId: "ord_8821", amount: 249 },
};

describe("validate handler", () => {
  it("passes a well-formed event through and stamps validatedAt", async () => {
    const result = await handler(message);

    expect(result.eventId).toBe("evt_5f2a9c");
    expect(result.validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects malformed state machine input", async () => {
    await expect(handler({ eventId: "nope" })).rejects.toMatchObject({
      name: "ValidationError",
    });
  });

  it("rejects a non-positive amount", async () => {
    await expect(
      handler({ ...message, payload: { orderId: "ord_8821", amount: -5 } }),
    ).rejects.toMatchObject({ name: "ValidationError" });
  });

  it("allows a payload with no amount at all", async () => {
    await expect(
      handler({ ...message, payload: { note: "no amount here" } }),
    ).resolves.toMatchObject({ eventType: "order.created" });
  });

  it("always fails the reserved test.fail event type", async () => {
    await expect(handler({ ...message, eventType: "test.fail" })).rejects.toMatchObject({
      name: "ValidationError",
    });
  });
});
