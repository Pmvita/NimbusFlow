/** Keys and limits shared by every function. Single-table design: one PK per event. */

/** TTL window for METADATA items. Keeps the table inside the free 25 GB cap. */
export const TTL_DAYS = 7;
export const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

/** Payloads stay small on purpose — there is no S3 in this stack. */
export const MAX_PAYLOAD_BYTES = 16 * 1024;

export const METADATA_SK = "METADATA";

export type EventStatus = "received" | "processing" | "stored" | "failed";
export type PipelineStage = "ingest" | "validate" | "enrich" | "store" | "notify";

export const eventPk = (eventId: string): string => `EVENT#${eventId}`;
export const auditSk = (timestamp: number, stage: PipelineStage): string =>
  `AUDIT#${timestamp}#${stage}`;

export const nowSeconds = (): number => Math.floor(Date.now() / 1000);
