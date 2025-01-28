'use client';

import { useState, useEffect } from 'react';
import CallList, { Call } from '@/app/ui/calls/call-list';
import { Campaign } from '@/app/lib/definitions';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    // Load campaign data
    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    const currentCampaign = campaigns.find((c: Campaign) => c.id === params.id);
    if (currentCampaign) {
      setCampaign(currentCampaign);
    }

    // Mock calls data for this campaign
    const mockCalls: Call[] = [
      {
        id: '1',
        caller_number: '+33612345678',
        callee_number: '+33123456789',
        caller_name: 'Jean Dupont',
        date: '2024-03-25T10:30:00',
        duration: 180,
        recording_url: '/test.mp3',
        transcript: 'Bonjour, je souhaiterais prendre rendez-vous...',
        sentiment: 'positive',
        call_type: 'outbound',
        agent_name: 'Agent Commercial',
        campaign_id: params.id,
        campaign_name: currentCampaign?.name,
        summary: 'Le client souhaite prendre rendez-vous pour une consultation.'
      },
      // Add more mock calls for this campaign
    ];
    setCalls(mockCalls);
  }, [params.id]);

  if (!campaign) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{campaign.name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>Créée le {new Date(campaign.created_at).toLocaleDateString()}</span>
          <span className="hidden md:inline">•</span>
          <span>{campaign.contacts_count} contacts</span>
        </div>
      </div>

      <CallList calls={calls} campaignView={true} />
    </div>
  );
}