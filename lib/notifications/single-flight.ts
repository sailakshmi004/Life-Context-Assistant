/**
 * Runs at most one task at a time in the current process.
 *
 * The scheduler container and dashboard both call the sync endpoint. This
 * prevents overlapping runs in the single app container; a future multi-instance
 * deployment would need a database-backed lock.
 */
export class SingleFlight<T> {
  private inFlight: Promise<T> | null = null;

  get busy(): boolean {
    return this.inFlight !== null;
  }

  run(task: () => Promise<T>, onBusy: () => T): Promise<T> {
    if (this.inFlight) {
      return Promise.resolve(onBusy());
    }

    const promise = task();
    this.inFlight = promise;
    promise
      .finally(() => {
        if (this.inFlight === promise) this.inFlight = null;
      })
      .catch(() => {
        // The caller receives the rejection through the returned promise.
      });

    return promise;
  }
}
