import express, { json as expressJson } from 'express';
import cors from 'cors';

/** Chat message shape */
interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Azure streaming event (subset we care about) */
interface AzureDelta {
  choices: {
    delta?: {
      content?: string;
    };
  }[];
}

/** Type guard to safely read Azure delta packets (no unsafe assignments) */
export function isAzureDelta(x: unknown): x is AzureDelta {
  if (typeof x !== 'object' || x === null) return false;

  const maybe = x as Record<string, unknown>;
  const choices: unknown = maybe.choices;
  if (!Array.isArray(choices)) return false;

  const first: unknown = choices[0];
  if (first === undefined) return true;
  if (typeof first !== 'object' || first === null) return false;

  const delta: unknown = (first as Record<string, unknown>).delta;
  if (delta === undefined) return true;
  if (typeof delta !== 'object' || delta === null) return false;

  const content: unknown = (delta as Record<string, unknown>).content;
  return content === undefined || typeof content === 'string';
}

/** Build Azure REST URL + headers (prefer ??; no any) */
export function getAzureConfig() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g., https://myres.openai.azure.com
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-4o-mini';
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-08-01-preview';

  if (apiKey === undefined || apiKey.length === 0) {
    throw new Error('Missing AZURE_OPENAI_API_KEY');
  }
  if (endpoint === undefined || endpoint.length === 0) {
    throw new Error('Missing AZURE_OPENAI_ENDPOINT');
  }

  const url =
    endpoint + '/openai/deployments/' + deployment + '/chat/completions?api-version=' + apiVersion;

  const headers = {
    'Content-Type': 'application/json',
    'api-key': apiKey,
  } as const;

  return { url, headers };
}

/** Factory that wires middleware and routes so tests can instantiate the app */
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(expressJson());

  /** POST /api/ai/chat — proxy Azure OpenAI streaming as SSE */
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const bodyUnknown: unknown = req.body ?? {};
      const body =
        typeof bodyUnknown === 'object' && bodyUnknown !== null
          ? (bodyUnknown as { messages?: ChatMsg[] })
          : { messages: [] };

      const { url, headers } = getAzureConfig();

      const system: ChatMsg = {
        role: 'system',
        content:
          'You are the Finance Manager AI Assistant. Be concise and cautious. ' +
          'Explain budgets, categorize spending, and outline savings plans. ' +
          'Never claim to access real user accounts unless a tool is explicitly provided.',
      };

      const clientMessages: ChatMsg[] = Array.isArray(body.messages) ? body.messages : [];

      const upstream = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [system, ...clientMessages],
          temperature: 0.2,
          stream: true,
        }),
      });

      if (!upstream.ok || upstream.body === null) {
        const text = await upstream.text().catch(() => '');
        res.status(500).json({ error: 'Upstream error ' + String(upstream.status) + ': ' + text });
        return;
      }

      // Prepare SSE response
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffered = '';

      while (true) {
        const read = await reader.read();
        if (read.done) break;

        buffered += decoder.decode(read.value, { stream: true });

        // Process complete SSE blocks separated by \n\n
        while (true) {
          const idx = buffered.indexOf('\n\n');
          if (idx === -1) break;

          const block = buffered.slice(0, idx);
          buffered = buffered.slice(idx + 2);

          const lines = block.split('\n');
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith('data:')) continue;

            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              res.write('event: done\ndata: [DONE]\n\n');
              res.end();
              return;
            }

            let parsed: unknown;
            try {
              parsed = JSON.parse(payload);
            } catch {
              // ignore non-JSON data lines
              continue;
            }

            if (isAzureDelta(parsed)) {
              const first = parsed.choices[0];
              const delta = first?.delta?.content;
              if (typeof delta === 'string' && delta.length > 0) {
                res.write('data: ' + delta + '\n\n');
              }
            }
          }
        }
      }

      // Final flush
      res.write('event: done\ndata: [DONE]\n\n');
      res.end();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : 'Internal Error';
      res.status(500).json({ error: msg });
    }
  });

  return app;
}

/** Port default using ?? (left side may be undefined) */
const port = Number(process.env.PORT ?? '8787');

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(port, () => {
    console.log('[ai-server] listening on http://localhost:' + String(port));
  });
}
