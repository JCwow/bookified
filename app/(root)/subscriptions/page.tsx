import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import SubscriptionPricingTable from '@/components/SubscriptionPricingTable';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription-constants';

const SubscriptionsPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <main className="clerk-subscriptions">
      <section className="mb-8 text-center">
        <h1 className="page-title">Choose your plan</h1>
        <p className="page-description">
          Upgrade anytime to unlock higher limits for books and voice sessions.
        </p>
      </section>
      <SubscriptionPricingTable />
    </main>
  );
};

export default SubscriptionsPage;
