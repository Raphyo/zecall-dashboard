'use client';

import { Campaign } from '@/app/lib/definitions';
import { formatDateToLocal } from '@/app/lib/utils';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { PlusIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';

function getStatusColor(status: Campaign['status']) {
  switch (status) {
    case 'brouillon':
      return 'bg-gray-100 text-gray-800';
    case 'planifiée':
      return 'bg-yellow-100 text-yellow-800';
    case 'en-cours':
      return 'bg-green-100 text-green-800';
    case 'terminée':
      return 'bg-blue-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const storedCampaigns = localStorage.getItem('campaigns');
    if (storedCampaigns) {
      setCampaigns(JSON.parse(storedCampaigns));
    }
  }, []);

  const handlePauseResume = (campaign: Campaign) => {
    const updatedCampaigns = campaigns.map(c => {
      if (c.id === campaign.id) {
        return {
          ...c,
          status: c.status === 'en-cours' ? 'planifiée' : 'en-cours'
        };
      }
      return c;
    });
    localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
    setCampaigns(updatedCampaigns as Campaign[]);
    setOpenMenuId(null);
  };

  const handleDuplicate = (campaign: Campaign) => {
    const newCampaign: Campaign = {
      ...campaign,
      id: crypto.randomUUID(),
      name: `${campaign.name} (copie)`,
      status: 'brouillon' as const,
      created_at: new Date().toISOString()
    };
    const updatedCampaigns = [...campaigns, newCampaign];
    localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
    setCampaigns(updatedCampaigns);
    setOpenMenuId(null);
  };

  // If there are no campaigns, show the centered create button
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          <h2 className="text-xl text-gray-600">Aucune campagne pour le moment</h2>
          <p className="text-gray-500">Commencez par créer votre première campagne</p>
          <Link
            href="/dashboard/campaigns/create"
            className="inline-flex items-center px-6 py-3 text-lg font-medium text-white rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <PlusIcon className="h-6 w-6 mr-2" />
            Créer une campagne
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Show create button in top right when there are campaigns */}
      <div className="flex justify-end mb-6">
        <Link
          href="/dashboard/campaigns/create"
          className="flex h-10 items-center rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 px-4 text-sm font-medium text-white transition-colors hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span className="hidden md:block">Créer une campagne</span>
          <PlusIcon className="h-5 md:ml-4" />
        </Link>
      </div>

      <div className="mt-6 flow-root">
        <div className="inline-block min-w-full align-middle">
          <div className="rounded-lg bg-gray-50 p-2 md:pt-0">
            <table className="hidden min-w-full text-gray-900 md:table">
              <thead className="rounded-lg text-left text-sm font-normal">
                <tr>
                  <th scope="col" className="px-4 py-5 font-medium">Nom</th>
                  <th scope="col" className="px-3 py-5 font-medium">Statut</th>
                  <th scope="col" className="px-3 py-5 font-medium">Contacts</th>
                  <th scope="col" className="px-3 py-5 font-medium">Date planifiée</th>
                  <th scope="col" className="px-3 py-5 font-medium">Créée le</th>
                  <th scope="col" className="relative px-3 py-5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="w-full border-b py-3 text-sm last-of-type:border-none">
                    <td className="whitespace-nowrap px-3 py-3">
                      <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-blue-600 hover:text-blue-800">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {campaign.contacts_count}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDateToLocal(campaign.scheduled_date)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDateToLocal(campaign.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === campaign.id ? null : campaign.id)}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                        </button>
                        
                        {openMenuId === campaign.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 z-20 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                              <div className="py-1">
                                <Link
                                  href={`/dashboard/campaigns/${campaign.id}/edit`}
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Modifier
                                </Link>
                                <button
                                  onClick={() => handleDuplicate(campaign)}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Dupliquer
                                </button>
                                {(campaign.status === 'en-cours' || campaign.status === 'planifiée') && (
                                  <button
                                    onClick={() => handlePauseResume(campaign)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    {campaign.status === 'en-cours' ? 'Mettre en pause' : 'Reprendre'}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const updatedCampaigns = campaigns.filter(c => c.id !== campaign.id);
                                    localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
                                    setCampaigns(updatedCampaigns);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile view */}
            <div className="md:hidden">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="mb-2 w-full rounded-md bg-white p-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        {campaign.name}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDateToLocal(campaign.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === campaign.id ? null : campaign.id)}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                        </button>
                        
                        {openMenuId === campaign.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 z-20 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                              <div className="py-1">
                                <Link
                                  href={`/dashboard/campaigns/${campaign.id}/edit`}
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Modifier
                                </Link>
                                <button
                                  onClick={() => handleDuplicate(campaign)}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Dupliquer
                                </button>
                                {(campaign.status === 'en-cours' || campaign.status === 'planifiée') && (
                                  <button
                                    onClick={() => handlePauseResume(campaign)}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    {campaign.status === 'en-cours' ? 'Mettre en pause' : 'Reprendre'}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const updatedCampaigns = campaigns.filter(c => c.id !== campaign.id);
                                    localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
                                    setCampaigns(updatedCampaigns);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 text-sm text-gray-500">
                    <p>{campaign.contacts_count} contacts</p>
                    <p className="mt-1">Planifiée pour: {formatDateToLocal(campaign.scheduled_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}