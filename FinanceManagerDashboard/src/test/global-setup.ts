export default async function registerSharedArrayBuffer() {
  if (typeof globalThis.SharedArrayBuffer !== 'undefined') {
    return;
  }

  const { SharedArrayBuffer: NodeSharedArrayBuffer } = await import('node:worker_threads');

  if (!NodeSharedArrayBuffer) {
    return;
  }

  Object.defineProperty(globalThis, 'SharedArrayBuffer', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: NodeSharedArrayBuffer as typeof globalThis.SharedArrayBuffer,
  });
}
