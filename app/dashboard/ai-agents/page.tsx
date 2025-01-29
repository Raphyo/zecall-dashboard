import { Suspense } from 'react';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AgentsListSkeleton } from '@/app/ui/skeletons';
import { AgentsList } from '@/app/ui/ai-agents/agent-list';

export default async function AIAgentsPage() {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Mes Agents IA</h1>
        <Link
          href="/dashboard/ai-agents/create"
          className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span className="hidden md:block">Créer un agent</span>
          <PlusIcon className="h-5 md:ml-4" />
        </Link>
      </div>
      <Suspense fallback={<AgentsListSkeleton />}>
        <AgentsList />
      </Suspense>
    </div>
  );
}