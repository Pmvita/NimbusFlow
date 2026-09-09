/**
 * Derived fields only. No external API calls — nothing here may add cost or latency
 * outside the account.
 */
import { EnrichmentError } from "../shared/errors";
import { createLogger } from "../shared/logger";
import { optionalEnv } from "../shared/env";
import type { EnrichedEvent, ValidatedEvent } from "../shared/schema";

export const handler = async (input: ValidatedEvent): Promise<EnrichedEvent> => {
  const log = createLogger({ fn: "enrich", stage: "enrich" });

  const [category, ...rest] = input.eventType.split(".");
  if (!category || rest.length === 0) {
    throw new EnrichmentError(`cannot derive category from eventType '${input.eventType}'`);
  }

  const serialized = JSON.stringify(input.payload);
  const enrichment = {
    category,
    action: rest.join("."),
    payloadKeyCount: Object.keys(input.payload).length,
    payloadSizeBytes: Buffer.byteLength(serialized, "utf8"),
    region: optionalEnv("AWS_REGION", "unknown"),
    enrichedAt: new Date().toISOString(),
  };

  log.info("enriched", { eventId: input.eventId, result: "ok", category });
  return { ...input, enrichment };
};
