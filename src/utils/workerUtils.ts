
export function createExportWorker(): Worker {
  return new Worker(new URL('../workers/exportWorker.ts', import.meta.url), {
    type: 'module',
  });
}
