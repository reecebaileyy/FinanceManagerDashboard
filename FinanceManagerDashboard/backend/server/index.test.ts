import { ReadableStream } from 'node:stream/web';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp, getAzureConfig, isAzureDelta } from './index';

const originalEnv = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('isAzureDelta', () => {
  it('returns true for a valid Azure streaming delta packet', () => {
    const valid = {
      choices: [
        {
          delta: {
            content: 'hello',
          },
        },
      ],
    };

    expect(isAzureDelta(valid)).toBe(true);
  });

  it('returns false for malformed payloads', () => {
    expect(isAzureDelta(null)).toBe(false);
    expect(isAzureDelta({})).toBe(false);
    expect(isAzureDelta({ choices: [{ delta: null }] })).toBe(false);
    expect(isAzureDelta({ choices: [{ delta: { content: 42 } }] })).toBe(false);
  });
});

describe('getAzureConfig', () => {
  it('builds the request configuration when required env vars are present', () => {
    process.env.AZURE_OPENAI_API_KEY = 'key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example.net';
    process.env.AZURE_OPENAI_DEPLOYMENT = 'my-model';
    process.env.AZURE_OPENAI_API_VERSION = '2024-01-01';

    const config = getAzureConfig();

    expect(config.url).toContain(
      'https://example.net/openai/deployments/my-model/chat/completions',
    );
    expect(config.headers['api-key']).toBe('key');
  });

  it('throws when the API key is missing', () => {
    delete process.env.AZURE_OPENAI_API_KEY;
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example.net';

    expect(() => getAzureConfig()).toThrow('Missing AZURE_OPENAI_API_KEY');
  });

  it('throws when the endpoint is missing', () => {
    process.env.AZURE_OPENAI_API_KEY = 'key';
    delete process.env.AZURE_OPENAI_ENDPOINT;

    expect(() => getAzureConfig()).toThrow('Missing AZURE_OPENAI_ENDPOINT');
  });
});

describe('POST /api/ai/chat', () => {
  const encoder = new TextEncoder();

  it('streams assistant deltas as SSE to the client', async () => {
    process.env.AZURE_OPENAI_API_KEY = 'key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example.net';

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(createApp())
      .post('/api/ai/chat')
      .send({ messages: [{ role: 'user', content: 'Hi' }] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toBe('data: Hello\n\nevent: done\ndata: [DONE]\n\n');
  });

  it('returns a 500 when the upstream request fails', async () => {
    process.env.AZURE_OPENAI_API_KEY = 'key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example.net';

    const upstream = new Response('boom', { status: 500 });
    const fetchMock = vi.fn().mockResolvedValue(upstream);
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(createApp())
      .post('/api/ai/chat')
      .send({ messages: [{ role: 'user', content: 'Hi' }] });

    expect(res.status).toBe(500);
    expect(res.text).toContain('Upstream error 500');
  });

  it('returns a 500 when Azure credentials are missing', async () => {
    delete process.env.AZURE_OPENAI_API_KEY;
    process.env.AZURE_OPENAI_ENDPOINT = 'https://example.net';

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(createApp())
      .post('/api/ai/chat')
      .send({ messages: [{ role: 'user', content: 'Hi' }] });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toBe(500);
    expect(res.text).toContain('Missing AZURE_OPENAI_API_KEY');
  });
});
