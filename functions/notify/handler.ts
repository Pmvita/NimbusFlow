/** NotifySubscribers: SNS email on success. This function may only publish. */
import { PublishCommand } from "@aws-sdk/client-sns";
import { sns } from "../shared/clients";
import { requireEnv } from "../shared/env";
import { createLogger } from "../shared/logger";
import type { NotifiedEvent, StoredEvent } from "../shared/schema";

export const handler = async (input: StoredEvent): Promise<NotifiedEvent> => {
  const log = createLogger({ fn: "notify", stage: "notify" });

  await sns.send(
    new PublishCommand({
      TopicArn: requireEnv("ALERT_TOPIC_ARN"),
      Subject: `NimbusFlow: ${input.eventType} stored`,
      Message: JSON.stringify(
        {
          eventId: input.eventId,
          eventType: input.eventType,
          status: "stored",
          storedAt: input.storedAt,
          enrichment: input.enrichment,
        },
        null,
        2,
      ),
    }),
  );

  log.info("notified", { eventId: input.eventId, result: "ok" });
  return { ...input, notifiedAt: new Date().toISOString() };
};
