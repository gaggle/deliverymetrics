import { asserts } from "../dev-deps.ts";

import { Retrier } from "./retrier.ts";

Deno.test("Retrier fetches a simple response", async () => {
  const cannedResponses: Array<Promise<Response>> = [
    Promise.resolve(new Response("👍", { status: 200 }))
  ];
  const retrier = new Retrier({ fetch: () => cannedResponses.shift()! });
  const resp = await retrier.fetch("https://x/foo");
  asserts.assertEquals(resp.status, 200);
});

Deno.test("Retrier retries an unwell response by default", async () => {
  const cannedResponses: Array<Promise<Response>> = [
    Promise.resolve(new Response("💥", { status: 400 })),
    Promise.resolve(new Response("👍", { status: 200 })),
  ];
  const retrier = new Retrier({ fetch: () => cannedResponses.shift()! });
  const resp = await retrier.fetch("https://x/foo");
  asserts.assertEquals(resp.status, 200);
});

Deno.test("Retrier retries an error", async () => {
  const cannedResponses: Array<Promise<Response>> = [
    Promise.reject(new Error("Weird network error") as unknown as Response),
    Promise.resolve(new Response("👍", { status: 200 })),
  ];
  const retrier = new Retrier({ fetch: () => cannedResponses.shift()! });
  const resp = await retrier.fetch("https://x/foo");
  asserts.assertEquals(resp.status, 200);
});

Deno.test("Retrier returns the most recent unwell response after max retries", async () => {
  const cannedResponses: Array<Promise<Response>> = [
    Promise.resolve(new Response("💥", { status: 400 })),
    Promise.resolve(new Response("💥", { status: 401 })),
    Promise.resolve(new Response("💥", { status: 404 })),
    Promise.resolve(new Response("🫖", { status: 418 })),
  ];
  const retrier = new Retrier({ fetch: () => cannedResponses.shift()!, maxRetries: 3 });
  const resp = await retrier.fetch("https://x/foo");
  asserts.assertEquals(resp.status, 418);
});

Deno.test("Retrier throws the most recent error after max retries", async () => {
  const cannedResponses: Array<Promise<Response>> = [
    Promise.reject(new Error("1️⃣") as unknown as Response),
    Promise.reject(new Error("2️⃣") as unknown as Response),
    Promise.reject(new Error("3️⃣") as unknown as Response),
  ];
  const retrier = new Retrier({ fetch: () => cannedResponses.shift()!, maxRetries: 2 });
  await asserts.assertRejects(() => retrier.fetch("https://x/foo"), Error, "3️⃣");
  // ↑ A max retries of 2 means Retrier should retry twice, meaning we get the 3rd attempt
});

Deno.test("Retrier when receiving alternating non-OK responses / errors", async (t) => {
  await t.step("throws if last retry was an error", async () => {
    const cannedResponses: Array<Promise<Response>> = [
      Promise.reject(new Error("1️⃣") as unknown as Response),
      // ↑ Given the first request results in this error…
      Promise.resolve(new Response("2️⃣", { status: 401 })),
      // ↑ then Retrier should retry, resulting in a bad response…
      Promise.reject(new Error("3️⃣") as unknown as Response),
      // ↑ and then an error again
    ];
    const retrier = new Retrier({ fetch: () => Promise.resolve(cannedResponses.shift()!), maxRetries: 2 });
    await asserts.assertRejects(() => retrier.fetch("https://x/foo"), Error, "3️⃣");
  });

  await t.step("rejects if last retry was a non-OK response", async () => {
    const cannedResponses: Array<Promise<Response>> = [
      Promise.reject(new Error("1️⃣") as unknown as Response),
      Promise.reject(new Error("2️⃣") as unknown as Response),
      Promise.resolve(new Response("3️⃣", { status: 418 })),
    ];
    const retrier = new Retrier({ fetch: () => Promise.resolve(cannedResponses.shift()!), maxRetries: 2 });
    const resp = await retrier.fetch("https://x/foo");
    asserts.assertEquals(resp.status, 418);
  });
});
