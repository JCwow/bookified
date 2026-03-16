'use client';

import { useAuth } from '@clerk/nextjs';
import { getPlanFromHas, getPlanLimitsFromHas } from '@/lib/subscription/utils';

export const useCurrentUserPlan = () => {
  const authState = useAuth();
  const { isLoaded, userId } = authState;
  const has = (authState as { has?: Parameters<typeof getPlanLimitsFromHas>[0] }).has;
  const { plan, limits } = getPlanLimitsFromHas(has);

  return {
    isLoaded,
    isSignedIn: Boolean(userId),
    plan,
    limits,
  };
};

export const useCurrentUserPlanType = () => {
  const authState = useAuth();
  const has = (authState as { has?: Parameters<typeof getPlanFromHas>[0] }).has;
  return getPlanFromHas(has);
};
