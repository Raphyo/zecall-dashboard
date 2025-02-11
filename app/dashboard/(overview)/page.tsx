'use client';

import { useEffect, useState } from 'react';
import { getCalls, getCampaigns, updateCampaignStatus } from '@/app/lib/api';
import { useSession } from 'next-auth/react';
import { 
  PhoneArrowUpRightIcon, 
  PhoneArrowDownLeftIcon, 
  ClockIcon, 
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { inter } from '@/app/ui/fonts';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Call } from '@/app/ui/calls/types';

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
    totalDuration: 0
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
          totalDuration
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
          {/* Today's Inbound Calls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Appels Entrants (Aujourd'hui)</h3>
              <span className="p-2 bg-blue-50 rounded-lg">
                <PhoneArrowDownLeftIcon className="w-5 h-5 text-blue-600" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.todayInbound}</p>
              <p className="text-sm text-gray-500 mt-1">Hier: {stats.yesterdayInbound}</p>
            </div>
          </div>

          {/* Today's Outbound Calls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Appels Sortants (Aujourd'hui)</h3>
              <span className="p-2 bg-green-50 rounded-lg">
                <PhoneArrowUpRightIcon className="w-5 h-5 text-green-600" />
              </span>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.todayOutbound}</p>
              <p className="text-sm text-gray-500 mt-1">Hier: {stats.yesterdayOutbound}</p>
            </div>
          </div>

          {/* Total Duration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Temps Total d'Appel</h3>
              <span className="p-2 bg-yellow-50 rounded-lg">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatTotalDuration(stats.totalDuration)}</p>
          </div>

          {/* Average Duration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Durée Moyenne</h3>
              <span className="p-2 bg-purple-50 rounded-lg">
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{formatDuration(stats.avgDuration)}</p>
          </div>

          {/* Total Calls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total des Appels</h3>
              <span className="p-2 bg-indigo-50 rounded-lg">
                <PhoneIcon className="w-5 h-5 text-indigo-600" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <PhoneArrowDownLeftIcon className="w-4 h-4 text-blue-600" />
                <p className="text-lg font-semibold text-gray-900">{stats.inboundCalls} entrants</p>
              </div>
              <div className="flex items-center gap-2">
                <PhoneArrowUpRightIcon className="w-4 h-4 text-green-600" />
                <p className="text-lg font-semibold text-gray-900">{stats.outboundCalls} sortants</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Activité Récente</h2>
            <div className="space-y-4">
              {recentCalls.map(call => (
                <div key={call.id} className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    call.direction === 'sortant' ? 'bg-green-50' : 'bg-blue-50'
                  }`}>
                    {call.direction === 'sortant' ? 
                      <PhoneArrowUpRightIcon className="w-5 h-5 text-green-600" /> :
                      <PhoneArrowDownLeftIcon className="w-5 h-5 text-blue-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{call.caller_number}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {call.call_status}
                      </span>
                      {call.call_category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {call.call_category}
                        </span>
                      )}
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(call.date + ' ' + call.hour), { 
                          addSuffix: true,
                          locale: fr 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{formatDuration(call.duration)}</div>
                </div>
              ))}
              {recentCalls.length === 0 && (
                <p className="text-center text-gray-500">Aucun appel récent</p>
              )}
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Campagnes Actives</h2>
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
                <p className="text-gray-500 text-center py-4">
                  Aucune campagne active
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}