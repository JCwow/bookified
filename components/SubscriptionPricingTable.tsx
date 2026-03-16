'use client';

import { PricingTable } from '@clerk/nextjs';

const SubscriptionPricingTable = () => {
  return (
    <div className="clerk-pricing-table-wrapper w-full">
      <PricingTable />
    </div>
  );
};

export default SubscriptionPricingTable;
