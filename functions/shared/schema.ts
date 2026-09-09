import { z } from "zod";
import { MAX_PAYLOAD_BYTES } from "./constants";

/** `<domain>.<action>`, e.g. order.created */
export const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;
export const EVENT_ID_PATTERN = /^evt_[0-9a-f]{6,32}$/;

/** Shape check at the API edge. Business rules live in the validate function. */
export const ingestRequestSchema = z.object({
  eventType: z
    .string()
    .min(3)
    .max(120)
    .regex(EVENT_TYPE_PATTERN, "eventType must look like 'order.created'"),
  payload: z
    .record(z.unknown())
    .refine((value) => Object.keys(value).length > 0, "payload must not be empty")
    .refine(
      (value) => Buffer.byteLength(JSON.stringify(value), "utf8") <= MAX_PAYLOAD_BYTES,
      `payload must be <= ${MAX_PAYLOAD_BYTES} bytes`,
    ),
});

export type IngestRequest = z.infer<typeof ingestRequestSchema>;

/** Message on SQS and input to the state machine. */
export const pipelineMessageSchema = z.object({
  eventId: z.string().regex(EVENT_ID_PATTERN),
  eventType: z.string().regex(EVENT_TYPE_PATTERN),
  payload: z.record(z.unknown()),
});

export type PipelineMessage = z.infer<typeof pipelineMessageSchema>;

export interface EnrichmentFields {
  category: string;
  action: string;
  payloadKeyCount: number;
  payloadSizeBytes: number;
  region: string;
  enrichedAt: string;
}

export interface ValidatedEvent extends PipelineMessage {
  validatedAt: string;
}

export interface EnrichedEvent extends ValidatedEvent {
  enrichment: EnrichmentFields;
}

export interface StoredEvent extends EnrichedEvent {
  storedAt: string;
}

export interface NotifiedEvent extends StoredEvent {
  notifiedAt: string;
}

export const formatIssues = (error: z.ZodError): Array<{ path: string; message: string }> =>
  error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
