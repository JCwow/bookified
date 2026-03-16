import { PLAN_SLUGS, PlanType, SUBSCRIPTION_PLANS } from '@/lib/subscription-constants';

type PlanCheck = { plan: string };
export type ClerkHasFn = (params: PlanCheck) => boolean;

export const getPlanFromHas = (has?: ClerkHasFn | null): PlanType => {
  if (has?.({ plan: PLAN_SLUGS.pro })) {
    return 'pro';
  }

  if (has?.({ plan: PLAN_SLUGS.standard })) {
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
