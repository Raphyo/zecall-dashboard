import { Metadata } from 'next';
import { CreateAIAgentForm } from '@/app/ui/ai-agents/create-form';
import { getAIAgent } from '@/app/lib/api';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Modifier l\'agent IA',
};

function LoadingAgentForm() {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
        <div className="p-6">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="p-6 border-t border-gray-100">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-gray-100">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  params: Promise<{
    id: string;
  }>;
}

async function EditAIAgentPageContent({ id }: { id: string }) {
  const agent = await getAIAgent(id);
  
  return (
    <CreateAIAgentForm agentId={id} initialData={agent} />
  );
}

export default async function EditAIAgentPage({ params }: Props) {
  const { id } = await params;
  
  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-8">Modifier l'agent IA</h1>
      <Suspense fallback={<LoadingAgentForm />}>
        <EditAIAgentPageContent id={id} />
      </Suspense>
    </div>
  );
}

/* Old client component code removed */