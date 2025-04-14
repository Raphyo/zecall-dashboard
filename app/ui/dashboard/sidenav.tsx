'use client';

import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import { useSession } from 'next-auth/react';
import ProfileMenu from '@/app/components/ProfileMenu';
import { useState, useEffect } from 'react';
import { CurrencyEuroIcon } from '@heroicons/react/24/outline';
import SubscriptionPackagesModal from '@/app/components/SubscriptionPackagesModal';
import { ClockIcon } from '@heroicons/react/24/outline';

export default function SideNav() {
  const { data: session } = useSession();
  const [credits, setCredits] = useState({ balance: 0, minutes: 0 });
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  // Add polling interval for credit updates
  useEffect(() => {
    fetchCredits(); // Initial fetch

    // Set up polling interval (every 30 seconds)
    const intervalId = setInterval(fetchCredits, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this effect runs once on mount

  // Add event listener for credit updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCredits(); // Fetch credits when tab becomes visible
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup event listener
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

      console.log('Credits response:', data);
      setCredits({
        balance: data.credits.balance,
        minutes: data.credits.minutes_balance
      });
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2">
      <Link
        className="mb-2 flex h-20 items-end justify-start rounded-md p-4 md:h-40"
        href="/"
      >
        <div className="w-32 md:w-40">
          <AcmeLogo />
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2">
        <NavLinks />
        <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        <div className="hidden md:flex flex-col space-y-4 px-3 py-2">
          {/* Credits and Subscribe Button */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center bg-blue-50 px-4 py-2 rounded-md border border-blue-100">
              <CurrencyEuroIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">{credits.balance.toFixed(2)}€</span>
            </div>
            <div className="flex items-center bg-purple-50 px-4 py-2 rounded-md border border-purple-100">
              <ClockIcon className="h-5 w-5 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-900">{credits.minutes} minutes</span>
            </div>
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 text-white font-medium rounded-lg shadow-sm transition-opacity duration-200 hover:opacity-90"
            >
              Acheter des crédits
            </button>
          </div>
          {/* Profile Menu */}
          {session?.user?.email && (
            <ProfileMenu email={session.user.email} />
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