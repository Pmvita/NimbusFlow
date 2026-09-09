#!/usr/bin/env node
/**
 * The one integration path: POST an event, poll the GET route until it is stored,
 * then confirm a bad body is rejected. Three requests total - this is not a load test.
 *
 * Usage: node tests/integration/smoke.mjs https://abc123.execute-api.us-east-1.amazonaws.com
 */

const baseUrl = process.argv[2]?.replace(/\/$/, "");
if (!baseUrl) {
  console.error("Usage: node tests/integration/smoke.mjs <api-base-url>");
  process.exit(2);
}

const POLL_ATTEMPTS = 10;
const POLL_DELAY_MS = 2000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const post = async (body) =>
  fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

const accepted = await post({
  eventType: "order.created",
  payload: { orderId: `ord_${Date.now()}`, amount: 249 },
});
if (accepted.status !== 202) fail(`expected 202 from POST, got ${accepted.status}`);

const { eventId } = await accepted.json();
console.log(`accepted ${eventId}`);

let status = "unknown";
for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
  await sleep(POLL_DELAY_MS);
  const lookup = await fetch(`${baseUrl}/api/events/${eventId}`);
  if (lookup.status !== 200) {
    console.log(`attempt ${attempt}: GET returned ${lookup.status}`);
    continue;
  }
  const event = await lookup.json();
  status = event.status;
  console.log(`attempt ${attempt}: status=${status} auditRows=${event.audit?.length ?? 0}`);
  if (status === "stored" || status === "failed") break;
}
if (status !== "stored") fail(`event settled as '${status}', expected 'stored'`);

const rejected = await post({ eventType: "NotValid", payload: {} });
if (rejected.status !== 400) fail(`expected 400 for a bad body, got ${rejected.status}`);

console.log("PASS: POST 202 -> stored -> bad POST 400");
