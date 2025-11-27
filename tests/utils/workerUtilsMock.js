
module.exports = {
  createExportWorker: jest.fn(() => ({
    postMessage: jest.fn(),
    onmessage: null,
    terminate: jest.fn(),
  })),
};
