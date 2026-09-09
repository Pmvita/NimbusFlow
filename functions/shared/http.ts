import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export const json = (statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const badRequest = (
  error: string,
  message: string,
  details?: unknown,
): APIGatewayProxyStructuredResultV2 => json(400, { error, message, details });

export const notFound = (message: string): APIGatewayProxyStructuredResultV2 =>
  json(404, { error: "not_found", message });

/** Internal failures never leak a stack trace to the caller — CloudWatch has it. */
export const serverError = (): APIGatewayProxyStructuredResultV2 =>
  json(500, { error: "internal_error", message: "Request could not be processed" });
