'use client';

import { useState, useEffect } from 'react';
import { 
  FunnelIcon, 
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { getCampaigns, type Campaign } from '@/app/lib/api';

interface FiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  callerNumber: string;
  calleeNumber: string;
  category: string;
  startDate: string;
  endDate: string;
  campaignId: string;
}

export function Filters({ onFilterChange }: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const { data: session } = useSession();
  const [filters, setFilters] = useState<FilterState>({
    callerNumber: '',
    calleeNumber: '',
    category: '',
    startDate: '',
    endDate: '',
    campaignId: '',
  });

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const data = await getCampaigns(session?.user?.email);
        setCampaigns(data);
      } catch (err) {
        console.error('Error loading campaigns:', err);
      }
    };
    loadCampaigns();
  }, [session]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const resetFilters = {
      callerNumber: '',
      calleeNumber: '',
      category: '',
      startDate: '',
      endDate: '',
      campaignId: '',
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const categories = [
    'New booking',
    'Booking modification',
    'Booking cancellation',
    'Information',
    'Outbound',
    'Inbound',
    'unknown'
  ];

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <FunnelIcon className="w-5 h-5" />
        Filtres
        {isOpen ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 p-6 bg-white rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium">Filtres</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <XMarkIcon className="w-4 h-4" />
              Réinitialiser
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Caller Number */}
            <div>
              <label htmlFor="callerNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Numéro appelant
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="callerNumber"
                  value={filters.callerNumber}
                  onChange={(e) => handleFilterChange('callerNumber', e.target.value)}
                  placeholder="+33612345678"
                  className="block w-full pl-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            {/* Callee Number */}
            <div>
              <label htmlFor="calleeNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Numéro destinataire
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PhoneIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="calleeNumber"
                  value={filters.calleeNumber}
                  onChange={(e) => handleFilterChange('calleeNumber', e.target.value)}
                  placeholder="+33612345678"
                  className="block w-full pl-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                id="category"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'Outbound' ? 'Sortant' :
                     category === 'Inbound' ? 'Entrant' :
                     category === 'New booking' ? 'Nouvelle réservation' :
                     category === 'Booking modification' ? 'Modification' :
                     category === 'Booking cancellation' ? 'Annulation' :
                     category === 'Information' ? 'Information' : 'Inconnu'}
                  </option>
                ))}
              </select>
            </div>

            {/* Campaign */}
            <div>
              <label htmlFor="campaign" className="block text-sm font-medium text-gray-700 mb-1">
                Campagne
              </label>
              <select
                id="campaign"
                value={filters.campaignId}
                onChange={(e) => handleFilterChange('campaignId', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Toutes les campagnes</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Période
              </label>
              <div className="flex flex-col gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Date début"
                />
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Date fin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}