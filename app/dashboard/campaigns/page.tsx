'use client';

import { useEffect, useState, Suspense } from 'react';
import { getCampaigns, deleteCampaign, duplicateCampaign, type Campaign, getCalls, updateCampaignStatus } from '@/app/lib/api';
import Link from 'next/link';
import { PlusIcon, EllipsisVerticalIcon, PlayCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { CampaignsTableSkeleton } from '@/app/ui/skeletons';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type Status = 'en-cours' | 'planifiée' | 'terminée' | 'brouillon';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const checkCampaignsStatus = async (campaigns: Campaign[]) => {
    try {
      // Get all calls in one request
      const allCalls = await getCalls(session?.user?.email);
      
      // Process locally
      for (const campaign of campaigns) {
        if (campaign.status !== 'terminée') {
          const campaignCalls = allCalls.filter(call => call.campaign_id === campaign.id);
          if (campaignCalls.length > 0) {
            const allCallsCompleted = campaignCalls.every(call => 
              call.call_status === 'completed'
            );
            
            if (allCallsCompleted) {
              await updateCampaignStatus(campaign.id, 'terminée');
              setCampaigns(prevCampaigns => 
                prevCampaigns.map(c => 
                  c.id === campaign.id ? { ...c, status: 'terminée' } : c
                )
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking campaigns status:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      const data = await getCampaigns(session?.user?.email);
      setCampaigns(data);
    } catch (err) {
      setError('Erreur lors du chargement des campagnes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) return;
    try {
      await deleteCampaign(id);
      loadCampaigns(); // Refresh the list
    } catch (err) {
      console.error('Error deleting campaign:', err);
      alert('Erreur lors de la suppression de la campagne');
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      await duplicateCampaign(campaign.id);
      loadCampaigns(); // Refresh the list
    } catch (err) {
      console.error('Error duplicating campaign:', err);
      alert('Erreur lors de la duplication de la campagne');
    }
  };

  const handleStatusUpdate = async (campaignId: string, newStatus: string) => {
    try {
      await updateCampaignStatus(campaignId, newStatus);
      loadCampaigns(); // Refresh the list
    } catch (err) {
      console.error('Error updating campaign status:', err);
      alert('Erreur lors de la mise à jour du statut de la campagne');
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Mes Campagnes</h1>
        <Link
          href="/dashboard/campaigns/create"
          className="flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span className="hidden md:block">Créer une campagne</span>
          <PlusIcon className="h-5 md:ml-4" />
        </Link>
      </div>
      {isLoading ? (
        <CampaignsTableSkeleton />
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center mt-24">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <PlusIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
          </div>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucune campagne</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par créer une nouvelle campagne.</p>
          <div className="mt-6">
            <Link
              href="/dashboard/campaigns/create"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              Créer une campagne
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Nom</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contacts</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Numéro</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Statut</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date planifiée</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Créée le</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}
                  onClick={() => router.push(`/dashboard/call-history?campaign=${campaign.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-500">
                    {campaign.id.substring(0, 8)}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {campaign.contacts_count}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {campaign.phone_number || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(campaign.status as Status)}`}>
                      {getStatusLabel(campaign.status as Status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {campaign.scheduled_date ? new Date(campaign.scheduled_date).toLocaleString() : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button 
                        onClick={(e: React.MouseEvent) => e.stopPropagation()} 
                        className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items 
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          className="fixed -ml-[144px] z-[100] mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          <div className="py-1">
                            <Menu.Item>
                              {({ active }: { active: boolean }) => (
                                <button
                                  onClick={() => handleDuplicate(campaign)}
                                  className={`${
                                    active ? 'bg-gray-100' : ''
                                  } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                                >
                                  Dupliquer
                                </button>
                              )}
                            </Menu.Item>
                            {campaign.status === 'en-cours' && (
                              <Menu.Item>
                                {({ active }: { active: boolean }) => (
                                  <button
                                    onClick={() => {
                                      if (confirm('Êtes-vous sûr de vouloir arrêter cette campagne ?')) {
                                        handleStatusUpdate(campaign.id, 'terminée');
                                      }
                                    }}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                                  >
                                    Arrêter
                                  </button>
                                )}
                              </Menu.Item>
                            )}
                            <Menu.Item>
                              {({ active }: { active: boolean }) => (
                                <button
                                  onClick={() => handleDelete(campaign.id)}
                                  className={`${
                                    active ? 'bg-gray-100 text-red-600' : 'text-red-500'
                                  } block w-full text-left px-4 py-2 text-sm`}
                                >
                                  Supprimer
                                </button>
                              )}
                            </Menu.Item>
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getStatusStyle(status: Status) {
  switch (status) {
    case 'en-cours':
      return 'bg-green-100 text-green-800';
    case 'planifiée':
      return 'bg-blue-100 text-blue-800';
    case 'terminée':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
}

function getStatusLabel(status: Status) {
  switch (status) {
    case 'en-cours':
      return 'En cours';
    case 'planifiée':
      return 'Planifiée';
    case 'terminée':
      return 'Terminée';
    default:
      return 'Brouillon';
  }
}