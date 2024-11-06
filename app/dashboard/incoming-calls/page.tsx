import { Suspense } from 'react';
import Table from '@/app/ui/incoming-calls/table';
import { fetchFilteredIncomingCalls } from '@/app/lib/data';
import { CallsTableSkeleton } from '@/app/ui/skeletons';
import Search from '@/app/ui/search';
import { auth } from '@/auth';

interface PageProps {
  params?: Promise<any>;
  searchParams?: Promise<any>;
}

export default async function Page({
  searchParams = Promise.resolve({})
}: PageProps) {
  await auth();
  
  const resolvedParams = await searchParams;
  const query = (resolvedParams?.query as string) || '';
  const currentPage = Number(resolvedParams?.page) || 1;
  
  // Fetch data on the server
  const calls = await fetchFilteredIncomingCalls(query, currentPage);

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl">Incoming Calls</h1>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 md:mt-8">
        <Search placeholder="Search calls..." />
      </div>
      <Suspense fallback={<CallsTableSkeleton />}>
        <Table calls={calls} />
      </Suspense>
    </div>
  );
}