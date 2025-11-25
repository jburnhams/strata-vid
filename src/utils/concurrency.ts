
/**
 * A utility class to limit the number of concurrent asynchronous operations.
 * Useful for queueing expensive tasks like thumbnail generation.
 */
export class ConcurrencyLimiter {
  private queue: (() => Promise<void>)[] = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Enqueues a task to be executed.
   * @param task A function that returns a promise.
   * @returns A promise that resolves with the task's result.
   */
  public execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const wrappedTask = async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      this.queue.push(wrappedTask);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (task) {
      this.activeCount++;
      try {
        await task();
      } finally {
        this.activeCount--;
        this.processQueue();
      }
    }
  }

  /**
   * Clears all pending tasks in the queue.
   * Active tasks will continue to completion.
   */
  public clear() {
      this.queue = [];
  }
}
