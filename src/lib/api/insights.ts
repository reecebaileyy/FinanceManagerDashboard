export type InsightMessageRole = "assistant" | "user";
export type InsightRecommendationStatus = "new" | "acknowledged" | "dismissed";
export type InsightFeedbackScore = "positive" | "negative";

export interface InsightMessage {
  id: string;
  role: InsightMessageRole;
  content: string;
  createdAt: string;
  feedback?: InsightFeedbackScore;
}

export interface InsightSession {
  sessionId: string;
  messages: InsightMessage[];
}

export interface InsightRecommendation {
  id: string;
  title: string;
  body: string;
  actionUrl: string;
  createdAt: string;
  impact: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  status: InsightRecommendationStatus;
}

export interface InsightOverviewPayload {
  session: InsightSession;
  recommendations: InsightRecommendation[];
  followUps: string[];
  disclaimers: string[];
}

export interface SendInsightMessageInput {
  sessionId?: string;
  message: string;
}

export interface SendInsightMessageResult {
  sessionId: string;
  reply: InsightMessage;
  recommendations: InsightRecommendation[];
  followUps: string[];
}

export interface SubmitInsightFeedbackInput {
  sessionId: string;
  messageId: string;
  score: InsightFeedbackScore;
  notes?: string;
}

interface InsightFixtureState {
  overview: InsightOverviewPayload;
}

const fixtureTimestamp = new Date("2025-09-15T16:45:00Z");

const baseFollowUps = [
  "Show my cash flow forecast for the next 3 months",
  "Where can I trim spending this week?",
  "How close am I to the vacation fund goal?",
];

const insightFixtureState: InsightFixtureState = {
  overview: {
    session: {
      sessionId: "ai-6ac7d0d3",
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content:
            "Hi Jordan! I reviewed your latest accounts. Dining and subscriptions are trending above plan, while transportation and groceries improved week-over-week. How can I help you today?",
          createdAt: new Date(fixtureTimestamp.getTime() - 1000 * 60 * 5).toISOString(),
        },
      ],
    },
    recommendations: [
      {
        id: "ins-a93d",
        title: "Lower dining spend by $100",
        body: "Dining out exceeded your September budget by 12%. Consider setting a weekly cap or scheduling home-cooked meals to stay on track.",
        actionUrl: "/dashboard/budgets",
        createdAt: new Date(fixtureTimestamp.getTime() - 1000 * 60 * 55).toISOString(),
        impact: "high",
        confidence: "high",
        status: "new",
      },
      {
        id: "ins-b41k",
        title: "Move idle cash into savings",
        body: "Your primary checking account averages $2,100 more than needed for bills. Automating a $400 weekly transfer would accelerate your home down payment goal.",
        actionUrl: "/dashboard/savings",
        createdAt: new Date(fixtureTimestamp.getTime() - 1000 * 60 * 90).toISOString(),
        impact: "medium",
        confidence: "medium",
        status: "new",
      },
    ],
    followUps: baseFollowUps,
    disclaimers: [
      "Insights are guidance only and not individualized financial advice.",
      "Review recommendations before taking action on linked accounts.",
    ],
  },
};

function createAssistantReply(message: string): {
  reply: string;
  recommendation?: InsightRecommendation;
  followUps: string[];
} {
  const normalized = message.trim().toLowerCase();

  if (!normalized) {
    return {
      reply: "I didn't catch that. Could you rephrase the question or share what you're trying to accomplish?",
      followUps: baseFollowUps,
    };
  }

  if (normalized.includes("dining")) {
    return {
      reply:
        "You spent $285.40 on dining last month, about $32 higher than your plan. Scheduling a weekly review and lowering discretionary dining to $60 per week would close the gap.",
      recommendation: {
        id: "ins-dining-followup",
        title: "Schedule a weekly dining review",
        body: "Set a Sunday reminder to reconcile dining transactions and move excess cash to savings.",
        actionUrl: "/dashboard/budgets?focus=dining",
        createdAt: new Date().toISOString(),
        impact: "medium",
        confidence: "high",
        status: "new",
      },
      followUps: [
        "How is my dining budget trending?",
        "Can you suggest lower-cost meal ideas?",
        baseFollowUps[2],
      ],
    };
  }

  if (normalized.includes("savings") || normalized.includes("save")) {
    return {
      reply:
        "Your emergency fund is 72% funded. Moving $300 from checking this week keeps you ahead of schedule. Want me to draft an automation plan?",
      followUps: [
        "Create an automation plan",
        "Compare savings rates across my accounts",
        baseFollowUps[0],
      ],
    };
  }

  if (normalized.includes("cash")) {
    return {
      reply:
        "Cash flow for September is projected at +$2,070. Discretionary spend is the largest lever—cutting $150 keeps you within the variance target.",
      followUps: [
        "Break down discretionary spending",
        "What if I increase my savings transfer?",
        baseFollowUps[1],
      ],
    };
  }

  return {
    reply:
      "Here's what I found: your spending is mostly on track. Focus on dining and subscriptions this week; both are trending over budget. Let me know if you'd like suggestions to adjust.",
    followUps: baseFollowUps,
  };
}

function createMessageId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return prefix + '-' + random;
}

export const insightsQueryKeys = {
  all: () => ["insights"] as const,
  overview: () => [...insightsQueryKeys.all(), "overview"] as const,
};

export async function fetchInsightsOverview(): Promise<InsightOverviewPayload> {
  const clone: InsightOverviewPayload = JSON.parse(JSON.stringify(insightFixtureState.overview));
  return Promise.resolve(clone);
}

export async function sendInsightMessage(
  input: SendInsightMessageInput,
): Promise<SendInsightMessageResult> {
  const sessionId = input.sessionId ?? insightFixtureState.overview.session.sessionId;
  const replyDetails = createAssistantReply(input.message);

  const reply: InsightMessage = {
    id: createMessageId("assistant"),
    role: "assistant",
    content: replyDetails.reply,
    createdAt: new Date().toISOString(),
  };

  const recommendations = replyDetails.recommendation ? [replyDetails.recommendation] : [];

  return Promise.resolve({
    sessionId,
    reply,
    recommendations,
    followUps: replyDetails.followUps,
  });
}

export async function submitInsightFeedback(
  _input: SubmitInsightFeedbackInput,
): Promise<{ acknowledged: true }> {
  return Promise.resolve({ acknowledged: true });
}
