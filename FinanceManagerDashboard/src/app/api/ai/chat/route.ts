// src/app/api/ai/chat/route.ts
import { type NextRequest } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/** Chat message shape accepted by Azure */
interface ChatMsg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Minimal shape of Azure SSE delta packets */
interface AzureDelta {
  choices: { delta?: { content?: string } }[];
}

/* ----------------------------- type guards ------------------------------ */
function isChatMsg(x: unknown): x is ChatMsg {
  if (typeof x !== 'object' || x === null) return false;
  const role = (x as { role?: unknown }).role;
  const content = (x as { content?: unknown }).content;
  const validRole = role === 'system' || role === 'user' || role === 'assistant';
  return validRole && typeof content === 'string';
}

function isAzureDelta(x: unknown): x is AzureDelta {
  if (typeof x !== 'object' || x === null) return false;

  const choicesUnknown: unknown = (x as Record<string, unknown>).choices;
  if (!Array.isArray(choicesUnknown)) return false;
  if (choicesUnknown.length === 0) return true;

  const firstUnknown: unknown = choicesUnknown[0];
  if (typeof firstUnknown !== 'object' || firstUnknown === null) return false;

  const deltaUnknown: unknown = (firstUnknown as Record<string, unknown>).delta;
  if (deltaUnknown === undefined) return true;
  if (typeof deltaUnknown !== 'object' || deltaUnknown === null) return false;

  const contentUnknown: unknown = (deltaUnknown as Record<string, unknown>).content;
  return contentUnknown === undefined || typeof contentUnknown === 'string';
}

function readMessagesFromBody(raw: unknown): ChatMsg[] {
  if (typeof raw !== 'object' || raw === null) return [];
  const msgsUnknown: unknown = (raw as { messages?: unknown }).messages;
  if (!Array.isArray(msgsUnknown)) return [];
  const out: ChatMsg[] = [];
  for (const m of msgsUnknown) if (isChatMsg(m)) out.push(m);
  return out;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message ?? 'Error';
  return typeof e === 'string' ? e : 'Error';
}

/* ------------------------------- config --------------------------------- */
function getAzureConfig() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://your-resource.openai.azure.com
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT; // exact DEPLOYMENT name
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2024-08-01-preview';

  const missing: string[] = [];
  if (!apiKey) missing.push('AZURE_OPENAI_API_KEY');
  if (!endpoint) missing.push('AZURE_OPENAI_ENDPOINT');
  if (!deployment) missing.push('AZURE_OPENAI_DEPLOYMENT');
  if (missing.length > 0) {
    throw new Error(`Missing required Azure envs: ${missing.join(', ')}`);
  }
  if (!/^https?:\/\//i.test(endpoint!)) {
    throw new Error('AZURE_OPENAI_ENDPOINT must start with https://');
  }

  const url = `${endpoint!.replace(/\/+$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const headers = { 'Content-Type': 'application/json', 'api-key': apiKey! } as const;
  return { url, headers };
}

/* -------------------------------- POST ---------------------------------- */
export async function POST(req: NextRequest) {
  try {
    // ✅ Avoid req.json() (which is `any` in your lint setup). Read text, then JSON.parse to unknown.
    const bodyText = await req.text();
    let clientMessages: ChatMsg[] = [];
    try {
      const parsed: unknown = bodyText ? (JSON.parse(bodyText) as unknown) : {};
      clientMessages = readMessagesFromBody(parsed);
    } catch {
      clientMessages = [];
    }

    // Guardrail system prompt
    const system: ChatMsg = {
      role: 'system',
      content:
        'You are the Finance Manager AI Assistant. Be concise and cautious. ' +
        'Explain budgets, categorize spending, and outline savings plans. ' +
        'Never claim access to real accounts unless tools are provided.',
    };

    const { url, headers } = getAzureConfig();

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
      const detail = await upstream.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: 'Azure upstream error', status: upstream.status, detail }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Stream Azure SSE -> client
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enc = new TextEncoder();
        const dec = new TextDecoder();
        const reader = upstream.body!.getReader();
        let buf = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buf += dec.decode(value, { stream: true });

            // Process complete SSE blocks (separated by blank line)
            let idx: number;
            while ((idx = buf.indexOf('\n\n')) !== -1) {
              const block = buf.slice(0, idx);
              buf = buf.slice(idx + 2);

              for (const line of block.split('\n')) {
                const t = line.trim();
                if (!t.startsWith('data:')) continue;

                const payload = t.slice(5).trim();
                if (payload === '[DONE]') {
                  controller.enqueue(enc.encode('event: done\ndata: [DONE]\n\n'));
                  controller.close();
                  return;
                }

                try {
                  const parsed: unknown = JSON.parse(payload);
                  if (isAzureDelta(parsed)) {
                    const firstUnknown: unknown = parsed.choices[0];
                    const deltaUnknown: unknown =
                      typeof firstUnknown === 'object' && firstUnknown !== null
                        ? (firstUnknown as { delta?: { content?: unknown } }).delta?.content
                        : undefined;
                    if (typeof deltaUnknown === 'string' && deltaUnknown.length > 0) {
                      controller.enqueue(enc.encode(`data: ${deltaUnknown}\n\n`));
                    }
                  }
                } catch {
                  // ignore non-JSON lines
                }
              }
            }
          }

          controller.enqueue(enc.encode('event: done\ndata: [DONE]\n\n'));
          controller.close();
        } catch (e: unknown) {
          controller.error(errorMessage(e));
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: errorMessage(err) ?? 'Internal Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
