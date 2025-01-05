import { Suspense } from 'react';
import Table from '@/app/ui/incoming-calls/table';
import { fetchFilteredIncomingCalls } from '@/app/lib/data';
import { CallsTableSkeleton } from '@/app/ui/skeletons';
import Search from '@/app/ui/search';
import { auth } from '@/auth';
import Pagination from '@/app/ui/incoming-calls/pagination';

interface PageProps {
  params?: Promise<{ [key: string]: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({
  params = Promise.resolve({}),
  searchParams = Promise.resolve({})
}: PageProps) {
  console.log('Dashboard Page Rendering');
  await auth();
  
  const resolvedSearchParams = await searchParams;
  const query = (resolvedSearchParams?.query as string) || '';
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  
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