/**
 * Single-flight concurrency tests for the notification sync lock.
 */

import { SingleFlight } from "@/lib/notifications/single-flight";

type Result = { test: string; passed: boolean; error?: string };

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export async function testSingleFlight(): Promise<Result[]> {
  const results: Result[] = [];

  const assert = (name: string, condition: boolean, errorMsg?: string) => {
    results.push({
      test: name,
      passed: condition,
      error: condition ? undefined : errorMsg || "Assertion failed",
    });
  };

  const flight = new SingleFlight<string>();
  const firstDeferred = deferred<string>();

  const first = flight.run(() => firstDeferred.promise, () => "busy");
  const second = flight.run(
    () => Promise.resolve("second"),
    () => "busy"
  );

  assert("Second call is short-circuited while busy", (await second) === "busy");
  assert("Flight reports busy while the first call runs", flight.busy);

  firstDeferred.resolve("first");
  assert("First call completes with its own result", (await first) === "first");

  // Allow the finally() cleanup microtask to run.
  await Promise.resolve();
  assert("Flight is no longer busy after completion", !flight.busy);

  const third = await flight.run(
    () => Promise.resolve("third"),
    () => "busy"
  );
  assert("A later call runs normally", third === "third");

  const failedDeferred = deferred<string>();
  const failed = flight.run(
    () => failedDeferred.promise,
    () => "busy"
  );
  failedDeferred.reject(new Error("boom"));
  let rejected = false;
  try {
    await failed;
  } catch {
    rejected = true;
  }
  await Promise.resolve();
  assert("Rejected task is surfaced and releases the lock", rejected && !flight.busy);

  return results;
}
