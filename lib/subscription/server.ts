import { auth } from '@clerk/nextjs/server';
import { getPlanFromHas, getPlanLimitsFromHas } from '@/lib/subscription/utils';

export const getCurrentUserPlanServer = async () => {
  const authState = await auth();
  const userId = authState.userId;
  const has = (authState as { has?: Parameters<typeof getPlanLimitsFromHas>[0] }).has;

  if (!userId) {
    return null;
  }

  return {
    userId,
    ...getPlanLimitsFromHas(has),
  };
};

export const getCurrentUserPlanTypeServer = async () => {
  const authState = await auth();
  const userId = authState.userId;
  const has = (authState as { has?: Parameters<typeof getPlanLimitsFromHas>[0] }).has;

  if (!userId) {
    return null;
  }

  return getPlanFromHas(has);
};
