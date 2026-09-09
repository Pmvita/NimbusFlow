import type { APIGatewayProxyEventV2, SQSEvent, SQSRecord } from "aws-lambda";

export const apiEvent = (overrides: {
  body?: string | null;
  pathParameters?: Record<string, string>;
}): APIGatewayProxyEventV2 =>
  ({
    version: "2.0",
    routeKey: "POST /api/events",
    rawPath: "/api/events",
    rawQueryString: "",
    headers: { "content-type": "application/json" },
    isBase64Encoded: false,
    ...overrides,
  }) as unknown as APIGatewayProxyEventV2;

export const sqsRecord = (body: string, messageId = "msg-0001"): SQSRecord =>
  ({
    messageId,
    receiptHandle: "handle",
    body,
    attributes: {
      ApproximateReceiveCount: "1",
      SentTimestamp: "1789137130000",
      SenderId: "AIDAEXAMPLE",
      ApproximateFirstReceiveTimestamp: "1789137130001",
    },
    messageAttributes: {},
    md5OfBody: "d41d8cd98f00b204e9800998ecf8427e",
    eventSource: "aws:sqs",
    eventSourceARN: "arn:aws:sqs:us-east-1:123456789012:nimbusflow-events",
    awsRegion: "us-east-1",
  }) as unknown as SQSRecord;

export const sqsEvent = (...records: SQSRecord[]): SQSEvent => ({ Records: records });

export const parseBody = <T = Record<string, unknown>>(body: string | undefined): T =>
  JSON.parse(body ?? "{}") as T;

export const awsError = (name: string, message = name): Error => {
  const err = new Error(message);
  err.name = name;
  return err;
};
