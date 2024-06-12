import React from 'react';
import CustomersTable from '@/app/ui/customers/table';
import { fetchFilteredCustomers } from '@/app/lib/data';

export default async function Page() {
  const customers = await fetchFilteredCustomers();
  return (
    <div>
      <CustomersTable customers={customers} />
    </div>
  );
}
