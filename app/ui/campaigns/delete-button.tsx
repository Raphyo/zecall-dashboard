'use client';

import { TrashIcon } from '@heroicons/react/24/outline';
import { deleteCampaign } from '@/app/lib/actions';

export default function DeleteButton({ campaignId }: { campaignId: string }) {
  return (
    <form action={deleteCampaign.bind(null, campaignId)}>
      <button
        className="text-red-600 hover:text-red-900"
        onClick={(e) => {
          if (!confirm('Are you sure you want to delete this campaign?')) {
            e.preventDefault();
          }
        }}
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </form>
  );
}