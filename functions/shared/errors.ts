/**
 * Error names are part of the contract: statemachine/pipeline.asl.json matches on them
 * for Retry and Catch, so renaming a class changes the workflow behaviour.
 */

export class ValidationError extends Error {
  override readonly name = "ValidationError";
  readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

export class EnrichmentError extends Error {
  override readonly name = "EnrichmentError";
}

/** Retried with backoff by the StoreRecord state. */
export class DynamoDbTransientError extends Error {
  override readonly name = "DynamoDbTransientError";
}

const TRANSIENT_DYNAMODB_ERRORS = new Set([
  "ProvisionedThroughputExceededException",
  "RequestLimitExceeded",
  "ThrottlingException",
  "InternalServerError",
  "ServiceUnavailable",
  "TimeoutError",
]);

/** Map throttles and 5xx to a retryable error; leave real bugs alone so they fail fast. */
export const rethrowDynamoDbError = (err: unknown): never => {
  if (err instanceof Error && TRANSIENT_DYNAMODB_ERRORS.has(err.name)) {
    throw new DynamoDbTransientError(`Transient DynamoDB failure: ${err.name}`);
  }
  throw err;
};
