'use client';

import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import { useSession } from 'next-auth/react';
import ProfileMenu from '@/app/components/ProfileMenu';
import { useState, useEffect } from 'react';
import { CurrencyEuroIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import SubscriptionPackagesModal from '@/app/components/SubscriptionPackagesModal';
import clsx from 'clsx';

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
    <div className={clsx(
      "flex h-full flex-col bg-white border-r border-gray-200 transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Logo Section */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6">
        <Link
          className="flex items-center transition-transform hover:scale-[0.98]"
          href="/"
        >
          <div className={clsx(
            "transition-all duration-300",
            isCollapsed ? "w-8" : "w-32 md:w-36"
          )}>
            <AcmeLogo />
          </div>
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>

      <div className="flex grow flex-col justify-between gap-4 px-4">
        {/* Navigation Links */}
        <div className="space-y-1 py-4">
          <NavLinks isCollapsed={isCollapsed} />
        </div>

        {/* Credits and Profile Section */}
        <div className={clsx(
          "space-y-6 pb-6 transition-opacity duration-300",
          isCollapsed && "opacity-0 pointer-events-none"
        )}>
          {/* Credits Display */}
          <div className="space-y-3 px-2">
            {/* Balance Card */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition-all hover:shadow-md">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-blue-100 p-2 group-hover:bg-blue-200 transition-colors">
                    <CurrencyEuroIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-600 opacity-80">Balance</p>
                    <p className="text-lg font-semibold text-blue-700">{credits.balance.toFixed(2)}€</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100/50 group-hover:bg-blue-100 transition-colors" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Minutes Card */}
            <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-4 transition-all hover:shadow-md">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-purple-100 p-2 group-hover:bg-purple-200 transition-colors">
                    <ClockIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-purple-600 opacity-80">Minutes</p>
                    <p className="text-lg font-semibold text-purple-700">{credits.minutes}</p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-100/50 group-hover:bg-purple-100 transition-colors" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/5 to-purple-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Buy Credits Button */}
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-[1px] transition-all hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 active:scale-[0.99]"
            >
              <div className="relative bg-white px-4 py-3 rounded-[11px] group transition-colors hover:bg-transparent">
                <span className="relative z-10 flex items-center justify-center text-sm font-semibold text-gray-900 transition-colors group-hover:text-white">
                  Acheter des crédits
                </span>
              </div>
            </button>
          </div>

          {/* Profile Menu */}
          {session?.user?.email && (
            <div className="px-2">
              <ProfileMenu email={session.user.email} />
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