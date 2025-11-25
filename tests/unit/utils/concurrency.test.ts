import { ConcurrencyLimiter } from '../../../src/utils/concurrency';

describe('ConcurrencyLimiter', () => {
  it('should execute a task and return the result', async () => {
    const limiter = new ConcurrencyLimiter(2);
    const result = await limiter.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('should limit concurrent tasks', async () => {
    const limiter = new ConcurrencyLimiter(2);
    let activeTasks = 0;
    let maxActive = 0;

    const task = async () => {
      activeTasks++;
      maxActive = Math.max(maxActive, activeTasks);
      await new Promise(resolve => setTimeout(resolve, 50));
      activeTasks--;
    };

    // Run 5 tasks
    await Promise.all([
      limiter.execute(task),
      limiter.execute(task),
      limiter.execute(task),
      limiter.execute(task),
      limiter.execute(task),
    ]);

    expect(maxActive).toBe(2);
  });

  it('should process all tasks eventually', async () => {
    const limiter = new ConcurrencyLimiter(1);
    const results: number[] = [];

    const task = (id: number) => async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      results.push(id);
    };

    await Promise.all([
      limiter.execute(task(1)),
      limiter.execute(task(2)),
      limiter.execute(task(3)),
    ]);

    expect(results).toHaveLength(3);
    expect(results).toContain(1);
    expect(results).toContain(2);
    expect(results).toContain(3);
  });

  it('should handle task errors gracefully', async () => {
      const limiter = new ConcurrencyLimiter(1);

      try {
          await limiter.execute(async () => {
              throw new Error('fail');
          });
      } catch (e) {
          expect((e as Error).message).toBe('fail');
      }

      // Should continue processing queue
      const result = await limiter.execute(async () => 'next');
      expect(result).toBe('next');
  });

  it('should clear pending tasks', async () => {
      const limiter = new ConcurrencyLimiter(1);
      let executed = 0;

      const task = async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          executed++;
      };

      // Start one task (active)
      const p1 = limiter.execute(task);
      // Queue others
      limiter.execute(task);
      limiter.execute(task);

      limiter.clear();

      await p1;

      // Only the first one should have executed
      expect(executed).toBe(1);
  });
});
