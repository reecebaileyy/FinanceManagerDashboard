'use client';

import * as React from 'react';

import ChatPanel from '@/features/ai-chat/ChatPanel';

export default function ChatWidget() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = sessionStorage.getItem('aiWidgetSeen');
    if (seen === '1') return;
    const t = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem('aiWidgetSeen', '1');
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div
        className="pointer-events-auto fixed right-5 bottom-5 z-[60] lg:right-auto lg:bottom-8 lg:left-6"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
          className="rounded-full border border-gray-200 bg-white px-4 py-3 font-medium text-gray-900 shadow-lg hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          🤖 Ask AI
        </button>
      </div>

      <div
        className={`pointer-events-none fixed inset-0 z-50 ${open ? '' : 'invisible'}`}
        aria-hidden={!open}
      >
        {/* Backdrop with a11y support */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Close AI Assistant"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') setOpen(false);
          }}
          className={`pointer-events-auto absolute inset-0 bg-black/20 transition-opacity ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Panel */}
        <section
          role="dialog"
          aria-modal="true"
          className={`pointer-events-auto absolute top-0 right-0 h-full w-full max-w-lg border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'} dark:border-slate-800 dark:bg-slate-900`}
        >
          <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                AI Assistant
              </h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-sm hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label="Close AI Assistant"
            >
              ✕
            </button>
          </header>

          <div className="h-[calc(100%-3rem)]">
            <ChatPanel />
          </div>
        </section>
      </div>
    </>
  );
}
