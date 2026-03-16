import { PLAN_SLUG_ALIASES, PlanType, SUBSCRIPTION_PLANS } from '@/lib/subscription-constants';

type PlanCheck = { plan: string };
export type ClerkHasFn = (params: PlanCheck) => boolean;

const hasAnyPlan = (has: ClerkHasFn | null | undefined, planSlugs: string[]): boolean =>
  planSlugs.some((slug) => has?.({ plan: slug }));

export const getPlanFromHas = (has?: ClerkHasFn | null): PlanType => {
  if (hasAnyPlan(has, PLAN_SLUG_ALIASES.pro)) {
    return 'pro';
  }

  if (hasAnyPlan(has, PLAN_SLUG_ALIASES.standard)) {
    return 'standard';
  }

  return 'free';
};

export const getPlanLimitsFromHas = (has?: ClerkHasFn | null) => {
  const plan = getPlanFromHas(has);
  return {
    plan,
    limits: SUBSCRIPTION_PLANS[plan],
  };
};
