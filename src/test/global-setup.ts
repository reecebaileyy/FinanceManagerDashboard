export default async function registerSharedArrayBuffer() {
  if (typeof globalThis.SharedArrayBuffer !== 'undefined') {
    return;
  }

  try {
    const workerThreads = await import('node:worker_threads');
    const { SharedArrayBuffer: NodeSharedArrayBuffer } = workerThreads;

    if (!NodeSharedArrayBuffer) {
      return;
    }

    Object.defineProperty(globalThis, 'SharedArrayBuffer', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: NodeSharedArrayBuffer as typeof globalThis.SharedArrayBuffer,
    });
  } catch (error) {
    // Worker threads not available, skip
    console.warn('SharedArrayBuffer polyfill not available:', error);
  }
}
