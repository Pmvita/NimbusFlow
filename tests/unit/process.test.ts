import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { handler } from "../../functions/process/handler";
import { awsError, sqsEvent, sqsRecord } from "../helpers/builders";

const sfnMock = mockClient(SFNClient);

const message = JSON.stringify({
  eventId: "evt_5f2a9c",
  eventType: "order.created",
  payload: { orderId: "ord_8821" },
});

describe("process handler", () => {
  beforeEach(() => {
    sfnMock.reset();
    process.env["STATE_MACHINE_ARN"] =
      "arn:aws:states:us-east-1:123456789012:stateMachine:nimbusflow-pipeline";
  });

  it("starts one execution per message with a deterministic name", async () => {
    sfnMock.on(StartExecutionCommand).resolves({});

    const result = await handler(sqsEvent(sqsRecord(message, "abc123def456")));

    expect(result.batchItemFailures).toEqual([]);
    const input = sfnMock.commandCalls(StartExecutionCommand)[0]?.args[0].input;
    expect(input?.name).toBe("evt_5f2a9c-abc123def456");
    expect(JSON.parse(String(input?.input))).toMatchObject({ eventId: "evt_5f2a9c" });
  });

  it("reports only the failed message so the rest of the batch settles", async () => {
    sfnMock
      .on(StartExecutionCommand)
      .resolvesOnce({})
      .rejectsOnce(awsError("StateMachineDoesNotExist"));

    const result = await handler(
      sqsEvent(sqsRecord(message, "good-msg"), sqsRecord(message, "bad-msg")),
    );

    expect(result.batchItemFailures).toEqual([{ itemIdentifier: "bad-msg" }]);
  });

  it("treats a duplicate execution as success", async () => {
    sfnMock.on(StartExecutionCommand).rejects(awsError("ExecutionAlreadyExists"));

    const result = await handler(sqsEvent(sqsRecord(message)));

    expect(result.batchItemFailures).toEqual([]);
  });

  it("fails a malformed message so it can reach the DLQ", async () => {
    const result = await handler(sqsEvent(sqsRecord("{ not json", "poison")));

    expect(result.batchItemFailures).toEqual([{ itemIdentifier: "poison" }]);
    expect(sfnMock.commandCalls(StartExecutionCommand)).toHaveLength(0);
  });
});
