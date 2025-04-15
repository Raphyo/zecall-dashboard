'use client';

import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import { useSession } from 'next-auth/react';
import ProfileMenu from '@/app/components/ProfileMenu';
import { useState, useEffect } from 'react';
import { CurrencyEuroIcon, ClockIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import SubscriptionPackagesModal from '@/app/components/SubscriptionPackagesModal';

export default function SideNav() {
  const { data: session } = useSession();
  const [credits, setCredits] = useState({ balance: 0, minutes: 0 });
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Add polling interval for credit updates
  useEffect(() => {
    fetchCredits();
    const intervalId = setInterval(fetchCredits, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Add event listener for credit updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCredits();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch credits');
      }

      setCredits({
        balance: data.credits.balance,
        minutes: data.credits.minutes_balance
      });
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  return (
    <div 
      className={`flex h-full flex-col bg-white/80 backdrop-blur-xl border-r border-gray-200/80 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Logo and Collapse Button */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <Link
          className="flex items-center transition-transform hover:scale-[0.98]"
          href="/"
        >
          <div className={`transition-all duration-300 ${isCollapsed ? 'w-8' : 'w-32'}`}>
            <AcmeLogo />
          </div>
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRightIcon 
            className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <div className="flex grow flex-col justify-between gap-4 px-4 py-6">
        {/* Navigation Links */}
        <div className="space-y-1">
          <NavLinks />
        </div>

        {/* Credits and Profile Section */}
        <div className="space-y-6">
          {/* Credits Display */}
          <div className="space-y-3">
            {/* Balance Card */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-blue-50/80 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-blue-100/50">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 shadow-inner shadow-blue-600/20">
                    <CurrencyEuroIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                    <p className="text-xs font-medium text-blue-600/80">Balance</p>
                    <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {credits.balance.toFixed(2)}€
                    </p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500/10 to-indigo-600/10" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Minutes Card */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-pink-50/50 to-purple-50/80 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-purple-100/50">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-2 shadow-inner shadow-purple-600/20">
                    <ClockIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
                    <p className="text-xs font-medium text-purple-600/80">Minutes</p>
                    <p className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {credits.minutes}
                    </p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500/10 to-pink-600/10" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/5 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Buy Credits Button */}
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className={`group relative w-full overflow-hidden rounded-2xl transition-all duration-300 ${
                isCollapsed ? 'p-2' : 'p-[1px]'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
              <div className="relative bg-white hover:bg-transparent px-4 py-3 rounded-[14px] transition-colors duration-300">
                <span className={`relative z-10 flex items-center justify-center font-medium transition-all duration-300 ${
                  isCollapsed 
                    ? 'text-transparent' 
                    : 'text-gray-900 group-hover:text-white'
                }`}>
                  {isCollapsed ? (
                    <CurrencyEuroIcon className="h-5 w-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                  ) : (
                    'Acheter des crédits'
                  )}
                </span>
              </div>
            </button>
          </div>

          {/* Profile Menu */}
          {session?.user?.email && (
            <div>
              <ProfileMenu email={session.user.email} isCollapsed={isCollapsed} />
            </div>
          )}
        </div>
      </div>

      <SubscriptionPackagesModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
      />
    </div>
  );
}