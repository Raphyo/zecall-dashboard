import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit AI Agent',
};

export default async function CampaignDetailPage() {
  return null; // Temporarily return null to make build pass
}

// 'use client';

// import { useState, useEffect } from 'react';
// import { Campaign } from '@/app/lib/definitions';
// import { Call } from '@/app/ui/calls/types';

// export default function CampaignDetailPage({ params }: { params: { id: string } }) {
//   const [campaign, setCampaign] = useState<Campaign | null>(null);

//   useEffect(() => {
//     // Load campaign data
//     const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
//     const currentCampaign = campaigns.find((c: Campaign) => c.id === params.id);
//     if (currentCampaign) {
//       setCampaign(currentCampaign);
//     }
//   }, [params.id]);

//   if (!campaign) {
//     return <div>Chargement...</div>;
//   }

//   return (
//     <div className="w-full">
//       <div className="mb-8">
//         <h1 className="text-2xl font-bold mb-2">{campaign.name}</h1>
//         <div className="flex flex-wrap gap-4 text-sm text-gray-600">
//           <span>Créée le {new Date(campaign.created_at).toLocaleDateString()}</span>
//           <span className="hidden md:inline">•</span>
//           <span>{campaign.contacts_count} contacts</span>
//         </div>
//       </div>

//       {/* <CallList calls={calls} campaignView={true} /> */}
//     </div>
//   );
// }