'use client';

import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import { useSession } from 'next-auth/react';
import ProfileMenu from '@/app/components/ProfileMenu';
import { useState, useEffect, useRef } from 'react';
import { CurrencyEuroIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Create a custom event for credit updates
export const creditUpdateEvent = new EventTarget();
export const CREDIT_UPDATE_EVENT = 'creditUpdate';

export default function SideNav() {
  const { data: session } = useSession();
  const [credits, setCredits] = useState(0);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState<string>('15');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const REFRESH_INTERVAL = 10000; // Match the 10-second refresh interval

  const fetchCredits = async (isRefresh = false) => {
    try {
      const response = await fetch('/api/credits');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch credits');
      }

      setCredits(data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCredits(false);

    // Set up interval for periodic refresh
    refreshIntervalRef.current = setInterval(() => {
      fetchCredits(true);
    }, REFRESH_INTERVAL);

    // Cleanup function
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input or valid numbers
    if (value === '' || /^\d+$/.test(value)) {
      setRechargeAmount(value);
    }
  };

  const handleBuyCredits = async () => {
    const amount = Number(rechargeAmount);
    if (amount < 15) {
      toast.error('Le montant minimum est de 15€');
      return;
    }

    try {
      setIsLoadingCheckout(true);
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      toast.error('Unable to process purchase. Please try again later.');
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  return (
    <div className="flex h-full flex-col px-3 py-4 md:px-2 overflow-hidden">
      <Link
        className="mb-2 flex h-20 items-end justify-start rounded-md p-4 md:h-40 shrink-0"
        href="/"
      >
        <div className="w-32 md:w-40">
          <AcmeLogo />
        </div>
      </Link>
      <div className="flex grow flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2 min-h-0">
        <div className="flex flex-row justify-between space-x-2 md:flex-col md:space-x-0 md:space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent flex-1">
          <NavLinks />
          <div className="hidden h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
          <div className="hidden md:flex flex-col space-y-4 px-3 py-2 shrink-0">
            {/* Credits and Recharge Button */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center bg-blue-50 px-4 py-2 rounded-md border border-blue-100">
                <CurrencyEuroIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">{credits.toFixed(2)}€</span>
              </div>
              <div className="relative rounded-lg p-[2px] bg-gradient-to-br from-pink-500 to-purple-600 shadow-sm">
                <div className="bg-white rounded-[6px] p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Acheter des crédits</h3>
                  <div className="relative mb-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        min="15"
                        value={rechargeAmount}
                        onChange={handleAmountChange}
                        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Montant"
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Minimum 15€</p>
                  </div>
                  <button
                    onClick={handleBuyCredits}
                    disabled={isLoadingCheckout || !rechargeAmount || Number(rechargeAmount) < 15}
                    className="w-full py-2 px-4 bg-gradient-to-br from-pink-500 to-purple-600 text-white font-medium rounded-lg shadow-sm transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    {isLoadingCheckout ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Chargement...
                      </div>
                    ) : (
                      'Payer'
                    )}
                  </button>
                </div>
              </div>
            </div>
            {/* Profile Menu */}
            {session?.user?.email && (
              <div className="mb-4">
                <ProfileMenu email={session.user.email} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}