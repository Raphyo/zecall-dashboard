import { Suspense } from 'react';
import Table from '@/app/ui/incoming-calls/table';
import { fetchFilteredIncomingCalls } from '@/app/lib/data';
import { CallsTableSkeleton } from '@/app/ui/skeletons';
import Search from '@/app/ui/search';
import { auth } from '@/auth';
import Pagination from '@/app/ui/incoming-calls/pagination';

interface PageProps {
  params?: Promise<any>;
  searchParams?: Promise<any>;
}

export default async function Page({
  searchParams = Promise.resolve({})
}: PageProps) {
  console.log('Dashboard Page Rendering'); // Add this line
  await auth();
  
  const resolvedParams = await searchParams;
  const query = (resolvedParams?.query as string) || '';
  const currentPage = Number(resolvedParams?.page) || 1;
  
  // Fetch data on the server
  const { calls, totalPages } = await fetchFilteredIncomingCalls(query, currentPage);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl">Calls</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Search calls..." />
      </div>
      <Suspense fallback={<CallsTableSkeleton />}>
        <Table calls={calls} />
      </Suspense>
      {/* Add mb-24 class to create space when audio player is present */}
      <div className="mb-24">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}