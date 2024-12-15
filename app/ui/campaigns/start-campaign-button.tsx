'use client';

import { startCampaign } from '@/app/lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StartCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('campaignId', campaignId);
      
      await startCampaign(formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start campaign');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleStart}
        disabled={loading}
        className="flex h-10 items-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-400 disabled:bg-blue-300"
      >
        {loading ? 'Starting...' : 'Start Campaign'}
      </button>
      
      {error && (
        <div className="mt-2 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}