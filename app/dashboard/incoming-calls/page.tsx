import { Suspense } from 'react';
import Table from '@/app/ui/incoming-calls/table';
import { fetchFilteredIncomingCalls } from '@/app/lib/data';
import { CallsTableSkeleton } from '@/app/ui/skeletons';
import Search from '@/app/ui/search';

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
  };
}) {
  // Wait for searchParams to be ready
  const params = await searchParams;
  
  // Now safely access the parameters
  const query = String(params?.query || '');
  const currentPage = Number(params?.page || '1');
  
  // Fetch data on the server
  const calls = await fetchFilteredIncomingCalls(query, currentPage);



  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl">Incoming Calls</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Search calls..." />
        <Search placeholder="Search calls..." />
      </div>
      <Suspense fallback={<CallsTableSkeleton />}>
        <Table calls={calls} />
      </Suspense>
    </div>
  );
}