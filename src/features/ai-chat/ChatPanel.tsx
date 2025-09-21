'use client';

import * as React from 'react';

type Role = 'user' | 'assistant';
interface Msg {
  role: Role;
  content: string;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message ?? 'Error';
  return typeof e === 'string' ? e : 'Error';
}

export default function ChatPanel() {
  const [messages, setMessages] = React.useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Hi! I’m your Finance Manager AI. I can help with budgets, spending categories, and savings plans. What would you like to do?',
    },
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    const next: Msg[] = [
      ...messages,
      { role: 'user', content },
      { role: 'assistant', content: '' },
    ];
    setMessages(next);
    setInput('');
    setIsLoading(true);

    try {
      interface ChatMsg {
        role: 'system' | 'user' | 'assistant';
        content: string;
      }
      const payload: ChatMsg[] = next.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      if (!res.ok || !res.body) {
        // read body text and try to parse JSON for detail/error
        const bodyText = await res.text();
        let msg: string | undefined;
        try {
          const j: unknown = JSON.parse(bodyText);
          if (typeof j === 'object' && j !== null) {
            const detail = (j as { detail?: unknown }).detail;
            const error = (j as { error?: unknown }).error;
            if (typeof detail === 'string') msg = detail;
            else if (typeof error === 'string') msg = error;
          }
        } catch {
          // ignore parse error, fall back to text or generic
          if (bodyText) msg = bodyText;
        }
        throw new Error(msg ?? 'Network error');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') break;
          aiText += data;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'assistant', content: aiText };
            return copy;
          });
        }
      }
    } catch (e: unknown) {
      const errMsg = errorMessage(e) ?? 'Sorry—something went wrong.';
      // replace the empty placeholder with the error message
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  }

  function TypingDots() {
    return (
      <div className="inline-flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500 dark:bg-slate-300" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:120ms] dark:bg-slate-400" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300 [animation-delay:240ms] dark:bg-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          const isEmptyAssistant = !isUser && m.content === '';
          return (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl border px-4 py-2 text-[0.95rem] leading-relaxed shadow-sm ${
                isUser
                  ? 'ml-auto border-blue-700 bg-blue-600 text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
              }`}
            >
              {isEmptyAssistant ? <TypingDots /> : m.content}
            </div>
          );
        })}
      </div>

      <form
        onSubmit={onSend}
        className="flex gap-2 border-t border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <input
          className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
          placeholder="Ask about budgets, categories, or trends…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
