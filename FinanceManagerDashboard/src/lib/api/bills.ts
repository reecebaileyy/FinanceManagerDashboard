export type BillFrequency = "monthly" | "quarterly" | "annual" | "weekly" | "biweekly";
export type BillStatus = "upcoming" | "dueSoon" | "dueToday" | "overdue" | "paid";
export type ReminderChannel = "email" | "sms" | "push";
export type ReminderStatus = "scheduled" | "sent";

export interface BillReminder {
  id: string;
  billId: string;
  type: "lead" | "dayOf" | "overdue";
  scheduledFor: string;
  channels: ReminderChannel[];
  status: ReminderStatus;
  message: string;
}

export interface Bill {
  id: string;
  name: string;
  amountCents: number;
  dueDate: string;
  frequency: BillFrequency;
  category: string;
  status: BillStatus;
  autoPayEnabled: boolean;
  accountName: string;
  lastPaidAt?: string;
  confirmationNumber?: string;
  notes?: string;
  reminders: BillReminder[];
}

export interface BillsWorkspacePayload {
  referenceDate: string;
  bills: Bill[];
}

const billsWorkspaceFixture: BillsWorkspacePayload = {
  referenceDate: "2025-09-10",
  bills: [
    {
      id: "bill-rent",
      name: "Downtown Loft Rent",
      amountCents: 245000,
      dueDate: "2025-09-01",
      frequency: "monthly",
      category: "Housing",
      status: "paid",
      autoPayEnabled: true,
      accountName: "High Yield Checking",
      lastPaidAt: "2025-09-01T14:05:00Z",
      confirmationNumber: "CHK91823",
      reminders: [
        {
          id: "rem-rent-lead",
          billId: "bill-rent",
          type: "lead",
          scheduledFor: "2025-08-28T14:00:00Z",
          channels: ["email", "push"],
          status: "sent",
          message: "Rent of $2,450 is scheduled for September 1.",
        },
        {
          id: "rem-rent-day",
          billId: "bill-rent",
          type: "dayOf",
          scheduledFor: "2025-09-01T13:00:00Z",
          channels: ["push"],
          status: "sent",
          message: "Rent auto-paid from High Yield Checking",
        },
      ],
    },
    {
      id: "bill-internet",
      name: "Fiber Internet",
      amountCents: 8900,
      dueDate: "2025-09-13",
      frequency: "monthly",
      category: "Utilities",
      status: "dueSoon",
      autoPayEnabled: false,
      accountName: "Cash Rewards Card",
      notes: "Provider waiver applies if paid before 15th",
      reminders: [
        {
          id: "rem-internet-lead",
          billId: "bill-internet",
          type: "lead",
          scheduledFor: "2025-09-10T15:00:00Z",
          channels: ["email"],
          status: "scheduled",
          message: "Internet bill of $89.00 due in 3 days.",
        },
        {
          id: "rem-internet-day",
          billId: "bill-internet",
          type: "dayOf",
          scheduledFor: "2025-09-13T14:00:00Z",
          channels: ["sms", "push"],
          status: "scheduled",
          message: "Today is the due date for your Fiber Internet payment.",
        },
      ],
    },
    {
      id: "bill-power",
      name: "Clean Energy Utility",
      amountCents: 14200,
      dueDate: "2025-09-20",
      frequency: "monthly",
      category: "Utilities",
      status: "upcoming",
      autoPayEnabled: true,
      accountName: "High Yield Checking",
      reminders: [
        {
          id: "rem-power-lead",
          billId: "bill-power",
          type: "lead",
          scheduledFor: "2025-09-16T14:00:00Z",
          channels: ["email", "push"],
          status: "scheduled",
          message: "Power bill of $142.00 coming up in 4 days.",
        },
        {
          id: "rem-power-day",
          billId: "bill-power",
          type: "dayOf",
          scheduledFor: "2025-09-20T14:00:00Z",
          channels: ["push"],
          status: "scheduled",
          message: "Power bill will auto-draft this afternoon.",
        },
      ],
    },
    {
      id: "bill-gym",
      name: "Wellness Collective Membership",
      amountCents: 6200,
      dueDate: "2025-09-11",
      frequency: "monthly",
      category: "Health & Fitness",
      status: "dueSoon",
      autoPayEnabled: false,
      accountName: "Travel Rewards Card",
      reminders: [
        {
          id: "rem-gym-lead",
          billId: "bill-gym",
          type: "lead",
          scheduledFor: "2025-09-09T15:00:00Z",
          channels: ["push"],
          status: "scheduled",
          message: "Gym membership renews in 2 days for $62.00.",
        },
        {
          id: "rem-gym-day",
          billId: "bill-gym",
          type: "dayOf",
          scheduledFor: "2025-09-11T13:00:00Z",
          channels: ["sms"],
          status: "scheduled",
          message: "Gym membership due today. Mark paid once charged.",
        },
      ],
    },
    {
      id: "bill-spotify",
      name: "Spotify Duo Subscription",
      amountCents: 1399,
      dueDate: "2025-09-17",
      frequency: "monthly",
      category: "Entertainment",
      status: "upcoming",
      autoPayEnabled: true,
      accountName: "Travel Rewards Card",
      reminders: [
        {
          id: "rem-spotify-lead",
          billId: "bill-spotify",
          type: "lead",
          scheduledFor: "2025-09-14T12:00:00Z",
          channels: ["push"],
          status: "scheduled",
          message: "Spotify subscription of $13.99 posts in 3 days.",
        },
      ],
    },
    {
      id: "bill-insurance",
      name: "Auto Insurance Premium",
      amountCents: 168500,
      dueDate: "2025-09-05",
      frequency: "quarterly",
      category: "Insurance",
      status: "overdue",
      autoPayEnabled: false,
      accountName: "High Yield Checking",
      notes: "Notify advisor if payment slips beyond 10 days overdue.",
      reminders: [
        {
          id: "rem-insurance-lead",
          billId: "bill-insurance",
          type: "lead",
          scheduledFor: "2025-08-29T15:00:00Z",
          channels: ["email"],
          status: "sent",
          message: "Auto insurance premium due Sept 5 for $1,685.00.",
        },
        {
          id: "rem-insurance-overdue",
          billId: "bill-insurance",
          type: "overdue",
          scheduledFor: "2025-09-08T15:00:00Z",
          channels: ["email", "sms"],
          status: "sent",
          message: "Auto insurance is 3 days past due. Consider manual payment.",
        },
      ],
    },
  ],
};

export const billsQueryKeys = {
  all: () => ["bills"] as const,
  workspace: () => [...billsQueryKeys.all(), "workspace"] as const,
};

export async function fetchBillsWorkspace(): Promise<BillsWorkspacePayload> {
  return Promise.resolve(billsWorkspaceFixture);
}
