'use client';

import { motion, AnimatePresence } from 'framer-motion';
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
        '👋 Hi! I’m your Finance Manager AI — here to help with budgets, spending categories, and savings plans. How can I help today?',
    },
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

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
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) throw new Error(`Server returned ${res.status}`);

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
          // Normalize streaming chunks (insert missing spaces and line breaks)
          const cleanChunk = data
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // separate joined words like "income,suchas"
            .replace(/(\.)([A-Z])/g, '$1 $2') // add space after period
            .replace(/([:,;])([^\s])/g, '$1 $2') // space after punctuation
            .replace(/\s+/g, ' ') // collapse weird spacing
            .trim();

          aiText += cleanChunk + ' ';

          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: 'assistant', content: aiText.trim() };
            return copy;
          });
        }
      }
    } catch (e) {
      const msg = errorMessage(e);
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: msg }]);
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
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-700 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            const isEmptyAssistant = !isUser && m.content === '';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-[0.95rem] leading-relaxed shadow-md transition-colors ${
                  isUser
                    ? 'ml-auto bg-blue-600 font-medium text-white'
                    : 'border border-gray-200 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {isEmptyAssistant ? <TypingDots /> : m.content}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input bar */}
      <form
        onSubmit={onSend}
        className="flex gap-2 border-t border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <input
          className="flex-1 rounded-xl border border-blue-500 bg-[#0b1222] px-3 py-2 outline-none placeholder:text-gray-300 focus:shadow-[0_0_10px_#3b82f6] focus:ring-2 focus:ring-blue-400 dark:border-blue-500 dark:bg-[#0b1222]"
          style={{ color: '#f9fafb' }} // 🔥 Forces bright white typing color
          placeholder="Ask about budgets, categories, or spending habits…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />

        <button
          className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
