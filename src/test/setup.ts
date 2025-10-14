if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
}

if (typeof globalThis.SharedArrayBuffer === 'undefined') {
  const { SharedArrayBuffer: NodeSharedArrayBuffer } = await import('node:worker_threads');

  if (NodeSharedArrayBuffer) {
    globalThis.SharedArrayBuffer = NodeSharedArrayBuffer as typeof globalThis.SharedArrayBuffer;
  }
}

const ReactGlobal = await import('react');

if (typeof (globalThis as Record<string, unknown>).React === 'undefined') {
  (globalThis as Record<string, unknown>).React = ReactGlobal;
}

// Extend here with shared test utilities/mocks as the test suite grows.
