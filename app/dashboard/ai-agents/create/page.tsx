import { Suspense } from 'react';
import { CreateAIAgentForm } from '@/app/ui/ai-agents/create-form';
import { CreateAgentSkeleton } from '@/app/ui/skeletons';

export default async function CreateAIAgentPage() {
  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-8">Créer un Agent IA</h1>
      <Suspense fallback={<CreateAgentSkeleton />}>
        <CreateAIAgentForm />
      </Suspense>
    </div>
  );
}