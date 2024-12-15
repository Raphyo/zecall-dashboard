import { Suspense } from 'react';
import Link from 'next/link';
import { fetchCampaigns } from '@/app/lib/data';
import { auth } from '@/auth';
import { PlusIcon } from '@heroicons/react/24/outline';
import CampaignsList from '@/app/ui/campaigns/campaigns-list';
import { Campaign } from '@/app/lib/definitions';


export default async function CampaignsPage() {
    await auth();
    // Transform the data to ensure status is of the correct type
    const rawCampaigns = await fetchCampaigns();
    const campaigns = rawCampaigns.map(campaign => ({
      ...campaign,
      status: campaign.status as Campaign['status']  // This ensures status is of the correct type
    })) as Campaign[];
  
    return (
      <div className="w-full">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-2xl">Campaigns</h1>
          <Link
            href="/dashboard/campaigns/create"
            className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <PlusIcon className="w-5" />
            Create Campaign
          </Link>
        </div>
  
        <Suspense fallback={<div>Loading...</div>}>
          <CampaignsList campaigns={campaigns} />
        </Suspense>
      </div>
    );
  }