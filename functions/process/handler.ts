/**
 * SQS -> Step Functions. Nothing else: this function exists so the API can answer 202
 * before the workflow starts.
 *
 * Failures are reported per message (ReportBatchItemFailures) so one poison message
 * cannot take a whole batch to the DLQ.
 */
import type { SQSBatchItemFailure, SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { StartExecutionCommand } from "@aws-sdk/client-sfn";
import { sfn } from "../shared/clients";
import { requireEnv } from "../shared/env";
import { createLogger, errorFields } from "../shared/logger";
import { pipelineMessageSchema } from "../shared/schema";

/** Execution names must be unique for 90 days and <= 80 chars. */
const executionName = (eventId: string, messageId: string): string =>
  `${eventId}-${messageId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 12)}`.slice(0, 80);

const startExecution = async (record: SQSRecord, stateMachineArn: string): Promise<string> => {
  const message = pipelineMessageSchema.parse(JSON.parse(record.body));

  await sfn.send(
    new StartExecutionCommand({
      stateMachineArn,
      name: executionName(message.eventId, record.messageId),
      input: JSON.stringify(message),
    }),
  );

  return message.eventId;
};

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const log = createLogger({ fn: "process", stage: "process" });
  const stateMachineArn = requireEnv("STATE_MACHINE_ARN");
  const batchItemFailures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const eventId = await startExecution(record, stateMachineArn);
      log.info("execution started", { eventId, result: "started" });
    } catch (err) {
      // A redriven message may already have an execution — that is success, not a retry.
      if (err instanceof Error && err.name === "ExecutionAlreadyExists") {
        log.info("execution already exists", {
          messageId: record.messageId,
          result: "duplicate",
        });
        continue;
      }
      log.error("could not start execution", {
        messageId: record.messageId,
        result: "error",
        ...errorFields(err),
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
