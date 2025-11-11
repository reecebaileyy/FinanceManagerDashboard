'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import controls from '@/styles/controls.module.css';
import patterns from '@/styles/patterns.module.css';

import { Card, CardBody, CardHeader } from '@components/dashboard/card';
import { InteractionErrorBoundary } from '@components/error-boundary';
import {
  fetchInsightsOverview,
  insightsQueryKeys,
  sendInsightMessage,
  submitInsightFeedback,
  type InsightFeedbackScore,
  type InsightMessage,
  type InsightOverviewPayload,
  type InsightRecommendation,
  type SendInsightMessageInput,
  type SendInsightMessageResult,
  type SubmitInsightFeedbackInput,
} from '@lib/api/insights';

import styles from './insights-workspace.module.css';

type ChatMessage = InsightMessage & {
  pending?: boolean;
};

const impactLabel: Record<InsightRecommendation['impact'], string> = {
  high: 'High impact',
  medium: 'Medium impact',
  low: 'Low impact',
};

const confidenceLabel: Record<InsightRecommendation['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

function classNames(...values: (string | undefined | false)[]) {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}

function createLocalId(prefix: string) {
  return prefix + '-' + Math.random().toString(36).slice(2, 10);
}

function formatTimeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function mergeRecommendations(
  existing: InsightRecommendation[],
  updates: InsightRecommendation[],
): InsightRecommendation[] {
  if (!updates.length) {
    return existing;
  }

  const seen = new Map(existing.map((item) => [item.id, item] as const));
  updates.forEach((item) => {
    seen.set(item.id, { ...item });
  });
  return Array.from(seen.values());
}

function sortRecommendations(items: InsightRecommendation[]) {
  return [...items].sort((a, b) => {
    const impactRank = { high: 0, medium: 1, low: 2 } as const;
    const statusRank = { new: 0, acknowledged: 1, dismissed: 2 } as const;
    const impactDelta = impactRank[a.impact] - impactRank[b.impact];
    if (impactDelta !== 0) {
      return impactDelta;
    }
    const statusDelta = statusRank[a.status] - statusRank[b.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function InsightsWorkspace() {
  const { data, isLoading } = useQuery({
    queryKey: insightsQueryKeys.overview(),
    queryFn: fetchInsightsOverview,
  });
  const queryClient = useQueryClient();

  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recommendations, setRecommendations] = useState<InsightRecommendation[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!data || bootstrappedRef.current) {
      return;
    }

    hydrateFromOverview(data);
    bootstrappedRef.current = true;
  }, [data]);

  function hydrateFromOverview(overview: InsightOverviewPayload) {
    setSessionId(overview.session.sessionId);
    setMessages(overview.session.messages);
    setRecommendations(sortRecommendations(overview.recommendations));
    setFollowUps(overview.followUps);
  }

  const sendMutation = useMutation<
    SendInsightMessageResult,
    Error,
    SendInsightMessageInput,
    {
      userMessage: ChatMessage;
      pendingMessage: ChatMessage;
      previousRecommendations: InsightRecommendation[];
      previousFollowUps: string[];
      previousInput: string;
    }
  >({
    mutationFn: sendInsightMessage,
    onMutate: (variables) => {
      const trimmed = variables.message.trim();
      const userMessage: ChatMessage = {
        id: createLocalId('user'),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };

      const pendingMessage: ChatMessage = {
        id: createLocalId('assistant'),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        pending: true,
      };

      setErrorMessage(null);
      setMessages((prev) => [...prev, userMessage, pendingMessage]);
      setInputValue('');

      return {
        userMessage,
        pendingMessage,
        previousRecommendations: recommendations,
        previousFollowUps: followUps,
        previousInput: trimmed,
      };
    },
    onError: (error, variables, context) => {
      console.error('Failed to send insight message', error);
      setErrorMessage("We couldn't reach the assistant. Try again in a moment.");

      if (context) {
        setMessages((prev) =>
          prev.filter(
            (message) =>
              message.id !== context.userMessage.id && message.id !== context.pendingMessage.id,
          ),
        );
        setRecommendations(context.previousRecommendations);
        setFollowUps(context.previousFollowUps);
        setInputValue(context.previousInput);
      } else {
        setMessages((prev) => prev.filter((message) => !message.pending));
        setInputValue(variables.message);
      }
    },
    onSuccess: (result, _variables, context) => {
      setSessionId(result.sessionId);
      setMessages((prev) =>
        prev.map((message) => {
          if (context && message.id === context.pendingMessage.id) {
            return { ...result.reply };
          }
          return message;
        }),
      );
      setRecommendations((prev) =>
        sortRecommendations(mergeRecommendations(prev, result.recommendations)),
      );
      setFollowUps(result.followUps);
      queryClient.setQueryData<InsightOverviewPayload>(insightsQueryKeys.overview(), (previous) => {
        if (!previous) {
          return previous;
        }

        const mergedRecommendations = mergeRecommendations(
          previous.recommendations,
          result.recommendations,
        );

        return {
          ...previous,
          session: {
            ...previous.session,
            sessionId: result.sessionId,
            messages: [...previous.session.messages, result.reply],
          },
          recommendations: mergedRecommendations,
          followUps: result.followUps,
        };
      });
    },
  });

  const feedbackMutation = useMutation<
    Awaited<ReturnType<typeof submitInsightFeedback>>,
    Error,
    SubmitInsightFeedbackInput,
    { messageId: string; previousFeedback: InsightFeedbackScore | undefined }
  >({
    mutationFn: submitInsightFeedback,
    onMutate: (variables) => {
      const previousFeedback = messages.find((item) => item.id === variables.messageId)?.feedback;
      setMessages((prev) =>
        prev.map((item) =>
          item.id === variables.messageId ? { ...item, feedback: variables.score } : item,
        ),
      );

      return { messageId: variables.messageId, previousFeedback };
    },
    onError: (error, variables, context) => {
      console.error('Failed to submit insight feedback', error);
      if (context) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === context.messageId ? { ...item, feedback: context.previousFeedback } : item,
          ),
        );
      }
    },
  });

  const isSending = sendMutation.isPending;

  const recommendationBadge = useMemo(() => {
    const fresh = recommendations.filter((item) => item.status === 'new').length;
    if (!fresh) {
      return undefined;
    }
    return fresh + ' new';
  }, [recommendations]);

  function handleSendMessage() {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) {
      return;
    }

    sendMutation.mutate({
      sessionId,
      message: trimmed,
    });
  }

  function handleFollowUpClick(prompt: string) {
    setInputValue(prompt);
  }

  function handleRecommendationStatus(id: string, status: InsightRecommendation['status']) {
    setRecommendations((prev) =>
      sortRecommendations(prev.map((item) => (item.id === id ? { ...item, status } : item))),
    );
  }

  const handleReset = () => {
    setErrorMessage(null);
    setInputValue('');
    setSessionId(undefined);
    setMessages([]);
    setRecommendations([]);
    setFollowUps([]);
    bootstrappedRef.current = false;
    sendMutation.reset();
    feedbackMutation.reset();
    queryClient.removeQueries({ queryKey: insightsQueryKeys.overview(), exact: true });
    void queryClient.invalidateQueries({ queryKey: insightsQueryKeys.overview() });
  };

  function handleFeedback(message: InsightMessage, score: InsightFeedbackScore) {
    if (!sessionId || message.feedback === score || feedbackMutation.isPending) {
      return;
    }

    feedbackMutation.mutate({
      sessionId,
      messageId: message.id,
      score,
    });
  }

  return (
    <InteractionErrorBoundary
      onReset={handleReset}
      title="Insights assistant hit a snag"
      description="Reload the assistant to continue the conversation."
      actionLabel="Reload assistant"
    >
      <section id="insights" className={styles.section} aria-busy={isLoading}>
        <div className={styles.workspace}>
          <Card className={styles.chatCard}>
            <CardHeader
              title="AI insights assistant"
              subtitle="Converse with the assistant to uncover next best actions"
              badge={recommendationBadge}
            />
            <CardBody className={styles.chatBody}>
              <div className={styles.messageList} role="log" aria-live="polite">
                {messages.length === 0 ? (
                  <div className={styles.emptyState}>Starting secure session…</div>
                ) : (
                  messages.map((message) => {
                    const rowClassName = classNames(
                      styles.messageRow,
                      message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                    );

                    const bubbleClassName = classNames(
                      styles.messageBubble,
                      message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                      message.pending && styles.messagePending,
                    );

                    return (
                      <div key={message.id} className={rowClassName}>
                        <div className={bubbleClassName}>
                          {message.pending ? (
                            <span>Drafting your personalized insight…</span>
                          ) : (
                            message.content
                          )}
                        </div>
                        <div className={styles.messageMeta}>
                          <span>{formatTimeLabel(message.createdAt)}</span>
                          {message.role === 'assistant' ? (
                            <div className={styles.feedbackGroup}>
                              <button
                                type="button"
                                className={classNames(
                                  styles.feedbackButton,
                                  message.feedback === 'positive' && styles.feedbackPositive,
                                )}
                                onClick={() => handleFeedback(message, 'positive')}
                                aria-label="Mark response helpful"
                              >
                                👍
                              </button>
                              <button
                                type="button"
                                className={classNames(
                                  styles.feedbackButton,
                                  message.feedback === 'negative' && styles.feedbackNegative,
                                )}
                                onClick={() => handleFeedback(message, 'negative')}
                                aria-label="Mark response not helpful"
                              >
                                👎
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {errorMessage ? <p className={styles.errorText}>{errorMessage}</p> : null}
              <div className={styles.inputArea}>
                <textarea
                  className={classNames(patterns.textarea, styles.textArea)}
                  rows={3}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  placeholder="Ask about budgets, accounts, or goals…"
                  aria-label="Message the insights assistant"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  className={classNames(controls.button, controls.buttonPrimary)}
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isSending}
                >
                  {isSending ? 'Sending…' : 'Send'}
                </button>
              </div>
              {followUps.length ? (
                <div className={styles.promptList}>
                  <span className={styles.promptLabel}>Try one of these:</span>
                  <div className={styles.promptChips}>
                    {followUps.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className={controls.pill}
                        onClick={() => handleFollowUpClick(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <ul className={styles.disclaimerList}>
                {data?.disclaimers?.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <div className={styles.recommendationsColumn}>
            <Card>
              <CardHeader
                title="Recommended actions"
                subtitle="Prioritized suggestions generated from your accounts"
                badge={recommendationBadge}
              />
              <CardBody className={styles.recommendationList}>
                {recommendations.length === 0 ? (
                  <p className={styles.emptyState}>
                    No recommendations yet. Check back after your next sync.
                  </p>
                ) : (
                  recommendations.map((item) => (
                    <article key={item.id} className={styles.recommendationItem}>
                      <header className={styles.recommendationHeader}>
                        <h3>{item.title}</h3>
                        <div className={styles.recommendationTags}>
                          <span className={controls.pill}>{impactLabel[item.impact]}</span>
                          <span className={controls.pill}>{confidenceLabel[item.confidence]}</span>
                          {item.status !== 'new' ? (
                            <span className={controls.pill}>
                              {item.status === 'acknowledged' ? 'Acknowledged' : 'Dismissed'}
                            </span>
                          ) : null}
                        </div>
                      </header>
                      <p className={styles.recommendationBody}>{item.body}</p>
                      <footer className={styles.recommendationFooter}>
                        <Link
                          href={item.actionUrl}
                          className={classNames(controls.button, styles.linkButton)}
                        >
                          Review details
                        </Link>
                        <div className={styles.recommendationActions}>
                          <button
                            type="button"
                            className={classNames(controls.button, styles.secondaryButton)}
                            onClick={() => handleRecommendationStatus(item.id, 'acknowledged')}
                          >
                            Mark as done
                          </button>
                          <button
                            type="button"
                            className={classNames(controls.button, styles.ghostButton)}
                            onClick={() => handleRecommendationStatus(item.id, 'dismissed')}
                          >
                            Dismiss
                          </button>
                        </div>
                      </footer>
                    </article>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </section>
    </InteractionErrorBoundary>
  );
}
