'use client';

import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import { useSession } from 'next-auth/react';
import ProfileMenu from '@/app/components/ProfileMenu';
import { useState, useEffect } from 'react';
import { CurrencyEuroIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import SubscriptionPackagesModal from '@/app/components/SubscriptionPackagesModal';
import clsx from 'clsx';

export default function SideNav() {
  const { data: session } = useSession();
  const [credits, setCredits] = useState({ balance: 0, minutes: 0 });
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadEmails, setUnreadEmails] = useState(0);

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

  // Fetch unread emails count
  useEffect(() => {
    fetchUnreadEmails();
    const emailIntervalId = setInterval(fetchUnreadEmails, 60000); // Check every minute
    return () => clearInterval(emailIntervalId);
  }, []);

  const fetchUnreadEmails = async () => {
    try {
      const response = await fetch('/api/gmail');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      const unreadCount = data.emails.filter((email: any) => email.unread).length;
      setUnreadEmails(unreadCount);
    } catch (error) {
      console.error('Error fetching unread emails:', error);
    }
  };

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

        {/* Email Notifications Section */}
        {!isCollapsed && unreadEmails > 0 && (
          <div className="px-2">
            <Link href="/dashboard/emails" className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-600 transition-colors hover:bg-indigo-100">
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="h-5 w-5" />
                <span>{unreadEmails} {unreadEmails === 1 ? 'email non lu' : 'emails non lus'}</span>
              </div>
            </Link>
          </div>
        )}

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

            {/* TODO: Temporarily hide Minutes Card */}
            {/*
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
            */}

            {/* TODO: Temporarily lock (disable) Buy Credits Button with visual feedback */}
            {/*
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
            */}
            <button
              className="relative w-full overflow-hidden rounded-xl bg-gray-200 p-[1px] transition-all cursor-not-allowed"
              disabled
              aria-disabled="true"
              title="Vous ne pouvez pas acheter de crédits pour le moment"
            >
              <div className="relative bg-gray-100 px-4 py-3 rounded-[11px] flex items-center justify-center gap-2">
                {/* Lock icon for disabled state */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7.5A4.5 4.5 0 008 7.5v3m8.25 0h-8.5A1.75 1.75 0 006 12.25v6A1.75 1.75 0 007.75 20h8.5A1.75 1.75 0 0018 18.25v-6A1.75 1.75 0 0016.25 10.5zm-6.75 0V7.5a2.25 2.25 0 114.5 0v3" />
                </svg>
                <span className="relative z-10 flex items-center justify-center text-sm font-semibold text-gray-400">
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