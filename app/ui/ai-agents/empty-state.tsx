'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export function EmptyState() {
  const router = useRouter();
  
  return (
    <div className="text-center max-w-md mx-auto p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Créez votre premier agent IA
      </h3>
      <p className="text-sm text-gray-500 mb-8">
        Commencez par créer un agent IA pour gérer vos appels entrants et sortants de manière automatisée.
      </p>
      <button
        onClick={() => router.push('/dashboard/ai-agents/create')}
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Créer un agent
      </button>
    </div>
  );
} 