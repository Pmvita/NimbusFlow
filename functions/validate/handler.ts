/**
 * Business rules for the ValidateData state. Shape was already checked at ingest, so
 * anything rejected here is a genuine rule violation and routes to HandleFailure.
 *
 * No AWS calls — this function only gets CloudWatch Logs permissions.
 */
import { MAX_PAYLOAD_BYTES } from "../shared/constants";
import { ValidationError } from "../shared/errors";
import { createLogger } from "../shared/logger";
import { pipelineMessageSchema, type PipelineMessage, type ValidatedEvent } from "../shared/schema";

/** Reserved event type used to rehearse the failure path (README: failure checks). */
const FORCED_FAILURE_EVENT_TYPE = "test.fail";

const assertBusinessRules = (message: PipelineMessage): void => {
  if (message.eventType === FORCED_FAILURE_EVENT_TYPE) {
    throw new ValidationError("eventType 'test.fail' always fails by design");
  }

  const size = Buffer.byteLength(JSON.stringify(message.payload), "utf8");
  if (size > MAX_PAYLOAD_BYTES) {
    throw new ValidationError(`payload is ${size} bytes, limit is ${MAX_PAYLOAD_BYTES}`);
  }

  const amount = message.payload["amount"];
  if (
    amount !== undefined &&
    (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)
  ) {
    throw new ValidationError("payload.amount must be a positive number when present");
  }
};

export const handler = async (input: unknown): Promise<ValidatedEvent> => {
  const log = createLogger({ fn: "validate", stage: "validate" });

  const parsed = pipelineMessageSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("state machine input is malformed", parsed.error.issues);
  }

  const message = parsed.data;
  try {
    assertBusinessRules(message);
  } catch (err) {
    log.warn("validation failed", {
      eventId: message.eventId,
      result: "failed",
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  log.info("validated", { eventId: message.eventId, result: "ok" });
  return { ...message, validatedAt: new Date().toISOString() };
};
