'use client';

import { useEffect, useState, useRef } from 'react';
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
    <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200/70 rounded animate-pulse"></div>
        <div className="h-8 w-8 bg-gray-200/70 rounded-xl animate-pulse"></div>
      </div>
      <div className="h-8 w-16 bg-gray-200/70 rounded animate-pulse"></div>
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const REFRESH_INTERVAL = 60000; // Refresh every 60 seconds to match call history page
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

  const loadDashboardData = async (isRefresh = false) => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    
    try {
      // Only show loading state on initial load
      if (!isRefresh) {
        setIsLoading(true);
      }

      const calls = await getCalls(session.user.id);
      const campaigns = await getCampaigns(session.user.id);
      
      // Get recent calls (last 10)
      const recent = calls
      .filter(call => call.date && call.hour)
      .sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.hour);
        const dateB = new Date(b.date + ' ' + b.hour);
        return dateB.getTime() - dateA.getTime();
      })
      .map(call => ({
        ...call,
        call_status: call.call_status || 'inconnu'
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
                campaign.status = 'terminée';
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
          completed_calls: calls.filter(call => 
            call.campaign_id === c.id && 
            call.call_status === 'terminé'
          ).length,
          progress: Math.round((calls.filter(call => 
            call.campaign_id === c.id && 
            call.call_status === 'terminé'
          ).length / c.contacts_count) * 100)
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
      if (!isRefresh) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    // Initial load
    loadDashboardData(false);

    // Set up interval for periodic refresh
    refreshIntervalRef.current = setInterval(() => {
      loadDashboardData(true);
    }, REFRESH_INTERVAL);

    // Cleanup function
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [session?.user?.id, status]);

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
    <main className="min-h-[80vh] relative bg-white">
      {/* Enhanced background design */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-purple-50/30" />
      <div className="absolute inset-0 bg-grid-slate-100/[0.05] bg-[size:20px_20px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent" />
      
      {/* Main content */}
      <div className="relative px-4 py-8 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
        {/* Enhanced Welcome Section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className={`${inter.className} text-[2.75rem] sm:text-6xl font-semibold tracking-tight leading-[1.15] mb-8`}>
            Bienvenue sur{' '}
            <span className="relative inline-flex items-center">
              <span className="relative">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 font-bold">
                  Zecall
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 font-bold">
                  .ai
                </span>
                <span className="absolute -bottom-1.5 left-0 right-0 h-[1px] bg-gradient-to-r from-blue-600/0 via-purple-600/50 to-indigo-600/0"></span>
              </span>
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600/90 leading-relaxed max-w-2xl mx-auto font-medium">
            Votre assistant téléphonique intelligent, propulsé par l'IA pour gérer les appels avec précision et professionnalisme
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Calls Card */}
          <div className="group relative bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/50 p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50/50 to-blue-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Nombre total d'appels</h3>
                <span className="p-2 bg-blue-50 rounded-xl ring-1 ring-blue-100/50 group-hover:bg-blue-100/80 transition-colors duration-300">
                  <PhoneIcon className="w-5 h-5 text-blue-600" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-gray-900">{stats.inboundCalls + stats.outboundCalls}</p>
                <span className="text-sm font-medium text-gray-500">appels</span>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <PhoneArrowDownLeftIcon className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-gray-600">{stats.inboundCalls} entrants</span>
                </div>
                <div className="flex items-center gap-1">
                  <PhoneArrowUpRightIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">{stats.outboundCalls} sortants</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Duration Card */}
          <div className="group relative bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/50 p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-50/50 to-yellow-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Temps Total</h3>
                <span className="p-2 bg-yellow-50 rounded-xl ring-1 ring-yellow-100/50 group-hover:bg-yellow-100/80 transition-colors duration-300">
                  <ClockIcon className="w-5 h-5 text-yellow-600" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-gray-900">{formatTotalDuration(stats.totalDuration)}</p>
                <span className="text-sm font-medium text-gray-500">minutes</span>
              </div>
            </div>
          </div>

          {/* Average Duration Card */}
          <div className="group relative bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/50 p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-50/50 to-purple-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Durée Moyenne</h3>
                <span className="p-2 bg-purple-50 rounded-xl ring-1 ring-purple-100/50 group-hover:bg-purple-100/80 transition-colors duration-300">
                  <ClockIcon className="w-5 h-5 text-purple-600" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-gray-900">{formatDuration(stats.avgDuration)}</p>
                <span className="text-sm font-medium text-gray-500">par appel</span>
              </div>
            </div>
          </div>

          {/* Total Cost Card */}
          <div className="group relative bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/50 p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-50/50 to-green-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Montant Total</h3>
                <span className="p-2 bg-green-50 rounded-xl ring-1 ring-green-100/50 group-hover:bg-green-100/80 transition-colors duration-300">
                  <CurrencyEuroIcon className="w-5 h-5 text-green-600" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCost.toFixed(2)}€</p>
                <span className="text-sm font-medium text-gray-500">pour {stats.inboundCalls + stats.outboundCalls} appels</span>
              </div>
            </div>
          </div>

          {/* Average Cost Card */}
          <div className="group relative bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100/50 p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">Coût Moyen</h3>
                <span className="p-2 bg-emerald-50 rounded-xl ring-1 ring-emerald-100/50 group-hover:bg-emerald-100/80 transition-colors duration-300">
                  <CurrencyEuroIcon className="w-5 h-5 text-emerald-600" />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-semibold text-gray-900">{stats.avgCostPerCall.toFixed(2)}€</p>
                <span className="text-sm font-medium text-gray-500">par appel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns Section */}
        <div className="grid md:grid-cols-1 gap-6 mt-12">
          <div className="group relative bg-white/50 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-100/50 hover:shadow-md transition-all duration-300">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-50/50 to-gray-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Campagnes en cours</h2>
                <Link
                  href="/dashboard/campaigns/create"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                >
                  <PlusIcon className="h-5 w-5" />
                  Nouvelle campagne
                </Link>
              </div>
              
              <div className="space-y-6">
                {activeCampaigns.map(campaign => (
                  <div key={campaign.id} className="group/campaign relative bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {campaign.completed_calls} / {campaign.total_calls} appels complétés
                          </p>
                        </div>
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          {campaign.progress}%
                        </span>
                      </div>
                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500" 
                          style={{ width: `${campaign.progress}%` }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-progress"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {activeCampaigns.length === 0 && (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 ring-8 ring-blue-50/30 flex items-center justify-center">
                      <PlusIcon className="h-8 w-8 text-blue-600" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">Aucune campagne en cours</h3>
                    <p className="mt-2 text-gray-500">Commencez par créer une nouvelle campagne pour automatiser vos appels.</p>
                    <div className="mt-8">
                      <Link
                        href="/dashboard/campaigns/create"
                        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-500 hover:to-indigo-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                      >
                        <PlusIcon className="h-5 w-5" />
                        Créer une campagne
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { transform: translateX(0); }
          to { transform: translateX(1rem); }
        }
        .animate-progress {
          animation: progress 1s linear infinite;
        }
        .bg-grid-slate-100 {
          mask-image: linear-gradient(to bottom, transparent, black, transparent);
          background-image: linear-gradient(to right, rgb(241 245 249 / 0.1) 1px, transparent 1px),
                          linear-gradient(to bottom, rgb(241 245 249 / 0.1) 1px, transparent 1px);
        }
      `}</style>
    </main>
  );
}