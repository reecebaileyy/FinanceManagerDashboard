export async function load(url, context, defaultLoad) {
  if (!globalThis.__sharedArrayBufferLoaderLogged) {
    // eslint-disable-next-line no-console
    console.info('[vitest] shared-array-buffer loader active');
    globalThis.__sharedArrayBufferLoaderLogged = true;
  }

  if (typeof globalThis.SharedArrayBuffer === 'undefined') {
    const { SharedArrayBuffer: NodeSharedArrayBuffer } = await import('node:worker_threads');

    if (NodeSharedArrayBuffer) {
      globalThis.SharedArrayBuffer = NodeSharedArrayBuffer;
    }
  }

  return defaultLoad(url, context);
}
