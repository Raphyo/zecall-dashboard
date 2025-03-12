'use client';

import { useEffect, useState } from 'react';
import { getCalls, getCampaigns, updateCampaignStatus } from '@/app/lib/api';
import { useSession } from 'next-auth/react';
import { 
  PhoneArrowUpRightIcon, 
  PhoneArrowDownLeftIcon, 
  ClockIcon, 
  PhoneIcon,
  PlusIcon,
  CurrencyEuroIcon,
} from '@heroicons/react/24/outline';
import { inter } from '@/app/ui/fonts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Call } from '@/app/ui/calls/types';
import { calculateCallCost } from '@/app/lib/utils';
import Link from 'next/link';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
      <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
    </div>
  );
}

type RecentCall = Pick<Call, 'id' | 'direction' | 'caller_number' | 'date' | 'hour' | 'duration' | 'call_category' | 'call_status'>;

interface Campaign {
  id: string;
  name: string;
  progress: number;
  total_calls: number;
  completed_calls: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    inboundCalls: 0,
    outboundCalls: 0,
    avgDuration: 0,
    avgCallsPerDay: 0,
    todayInbound: 0,
    todayOutbound: 0,
    yesterdayInbound: 0,
    yesterdayOutbound: 0,
    totalDuration: 0,
    totalCost: 0,
    avgCostPerCall: 0
  });
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login';
    }
  }, [status]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (status !== 'authenticated' || !session?.user?.email) return;
      
      try {
        setIsLoading(true);
        const calls = await getCalls(session.user.email);
        const campaigns = await getCampaigns(session.user.email);
        
        // Get recent calls (last 10)
        const recent = calls
        .filter(call => call.date && call.hour) // Ensure we have valid date and hour
        .sort((a, b) => {
          const dateA = new Date(a.date + ' ' + a.hour);
          const dateB = new Date(b.date + ' ' + b.hour);
          return dateB.getTime() - dateA.getTime();
        })
        .map(call => ({
          ...call,
          call_status: call.call_status || 'inconnu' // Provide a default value for null
        }))
        .slice(0, 10);
        setRecentCalls(recent);

        // Check and update campaign statuses
        for (const campaign of campaigns) {
          if (campaign.status !== 'terminée') {
            const campaignCalls = calls.filter(call => call.campaign_id === campaign.id);
            if (campaignCalls.length > 0 && campaignCalls.length >= campaign.contacts_count) {
              const allCallsCompleted = campaignCalls.every(call => 
                call.call_status === 'completed' || call.call_status === 'failed'
              );
              
              if (allCallsCompleted) {
                try {
                  await updateCampaignStatus(campaign.id, 'terminée');
                  campaign.status = 'terminée'; // Update local state
                } catch (error) {
                  console.error('Error updating campaign status:', error);
                }
              }
            }
          }
        }

        // Get today's and yesterday's dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Filter calls for today and yesterday
        const todayCalls = calls.filter(call => {
          const callDate = new Date(call.date);
          return callDate >= today && callDate < tomorrow;
        });

        const yesterdayCalls = calls.filter(call => {
          const callDate = new Date(call.date);
          return callDate >= yesterday && callDate < today;
        });

        // Count today's calls by direction
        const todayInbound = todayCalls.filter(call => call.direction === 'entrant').length;
        const todayOutbound = todayCalls.filter(call => call.direction === 'sortant').length;

        // Count yesterday's calls by direction
        const yesterdayInbound = yesterdayCalls.filter(call => call.direction === 'entrant').length;
        const yesterdayOutbound = yesterdayCalls.filter(call => call.direction === 'sortant').length;

        // Count total calls by direction
        const inboundCalls = calls.filter(call => call.direction === 'entrant').length;
        const outboundCalls = calls.filter(call => call.direction === 'sortant').length;

        // Calculate total duration (in seconds)
        const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
        const avgDuration = calls.length > 0 ? Math.round(totalDuration / calls.length) : 0;

        // Calculate average calls per day
        const dates = [...new Set(calls.map(call => call.date.split('T')[0]))];
        const avgCallsPerDay = dates.length > 0 ? Math.round(calls.length / dates.length) : 0;

        // Calculate total cost and average cost per call
        let totalCost = 0;
        try {
          totalCost = calls.reduce((sum, call) => {
            const callCost = calculateCallCost(call.duration || 0);
            return sum + (Number(callCost) || 0);
          }, 0);
        } catch (error) {
          console.error('Error calculating total cost:', error);
        }

        const avgCostPerCall = calls.length > 0 ? totalCost / calls.length : 0;

        // Get active campaigns
        const active = campaigns
          .filter(c => c.status !== 'terminée')
          .map(c => ({
            id: c.id,
            name: c.name,
            total_calls: c.contacts_count,
            completed_calls: calls.filter(call => call.campaign_id === c.id).length,
            progress: Math.round((calls.filter(call => call.campaign_id === c.id).length / c.contacts_count) * 100)
          }));
        setActiveCampaigns(active);

        setStats({
          inboundCalls,
          outboundCalls,
          avgDuration,
          avgCallsPerDay,
          todayInbound,
          todayOutbound,
          yesterdayInbound,
          yesterdayOutbound,
          totalDuration,
          totalCost,
          avgCostPerCall
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // Set up periodic refresh
    const refreshInterval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [session?.user?.email, status]);

  // Show loading state
  if (status === 'loading' || isLoading) {
    return (
      <main className="min-h-[80vh] relative bg-gray-50">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50" />
        <div className="relative px-4 py-8 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
          {/* Welcome Section Skeleton */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="h-12 w-2/3 bg-gray-200 rounded animate-pulse mx-auto mb-6"></div>
            <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mx-auto"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </main>
    );
  }

  // Show nothing if not authenticated
  if (!session) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (seconds: number) => {
    if (!seconds) return '0 min';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <main className="min-h-[80vh] relative bg-gray-50">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50" />
      
      {/* Main content */}
      <div className="relative px-4 py-8 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
        {/* Welcome Section */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className={`${inter.className} text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-[1.15] mb-6`}>
            Bienvenue sur{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 font-bold">
              Zecall.ai
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Votre assistant téléphonique intelligent, propulsé par l'IA pour gérer les appels avec précision et professionnalisme
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Today's Inbound Calls -> Total Calls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Nombre total d'appels</h3>
              <span className="p-2 bg-blue-50 rounded-lg">
                <PhoneIcon className="w-5 h-5 text-blue-600" />
              </span>
            </div>
            <div className="flex flex-col">
              <p className="text-2xl font-semibold text-gray-900">{stats.inboundCalls + stats.outboundCalls}</p>
            </div>
          </div>

          {/* Total Duration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Temps Total</h3>
              <span className="p-2 bg-yellow-50 rounded-lg">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
              </span>
            </div>
            <div className="flex flex-col">
              <p className="text-2xl font-semibold text-gray-900">{formatTotalDuration(stats.totalDuration)}</p>
            </div>
          </div>

          {/* Average Duration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Durée Moyenne</h3>
              <span className="p-2 bg-purple-50 rounded-lg">
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </span>
            </div>
            <div className="flex flex-col">
              <p className="text-2xl font-semibold text-gray-900">{formatDuration(stats.avgDuration)}</p>
            </div>
          </div>

          {/* Total Cost */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Montant Total</h3>
              <span className="p-2 bg-green-50 rounded-lg">
                <CurrencyEuroIcon className="w-5 h-5 text-green-600" />
              </span>
            </div>
            <div className="flex flex-col">
              <p className="text-2xl font-semibold text-gray-900">{stats.totalCost.toFixed(2)}€</p>
            </div>
          </div>

          {/* Average Cost */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Coût Moyen</h3>
              <span className="p-2 bg-emerald-50 rounded-lg">
                <CurrencyEuroIcon className="w-5 h-5 text-emerald-600" />
              </span>
            </div>
            <div className="flex flex-col">
              <p className="text-2xl font-semibold text-gray-900">{stats.avgCostPerCall.toFixed(2)}€</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-1 gap-6 mt-12">
          {/* Active Campaigns */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Campagnes</h2>
            <div className="space-y-4">
              {activeCampaigns.map(campaign => (
                <div key={campaign.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm font-medium">{campaign.progress}%</p>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${campaign.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {campaign.completed_calls} / {campaign.total_calls} appels complétés
                  </p>
                </div>
              ))}
              {activeCampaigns.length === 0 && (
                <div className="text-center py-8">
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
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}