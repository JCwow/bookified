export const PLAN_SLUGS = {
  standard: 'standard',
  pro: 'pro',
} as const;

export type PlanType = 'free' | keyof typeof PLAN_SLUGS;

export type PlanLimits = {
  maxBooks: number;
  maxSessionsPerMonth: number | null;
  maxSessionMinutes: number;
  hasSessionHistory: boolean;
};

export const SUBSCRIPTION_PLANS: Record<PlanType, PlanLimits> = {
  free: {
    maxBooks: 1,
    maxSessionsPerMonth: 5,
    maxSessionMinutes: 5,
    hasSessionHistory: false,
  },
  standard: {
    maxBooks: 10,
    maxSessionsPerMonth: 100,
    maxSessionMinutes: 15,
    hasSessionHistory: true,
  },
  pro: {
    maxBooks: 100,
    maxSessionsPerMonth: null,
    maxSessionMinutes: 60,
    hasSessionHistory: true,
  },
};

export const getCurrentBillingPeriodStart = (date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);