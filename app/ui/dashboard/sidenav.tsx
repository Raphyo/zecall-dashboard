'use client';

import Link from 'next/link';
import NavLinks from '@/app/ui/dashboard/nav-links';
import AcmeLogo from '@/app/ui/acme-logo';
import { useSession } from 'next-auth/react';
import ProfileMenu from '@/app/components/ProfileMenu';
import { useState, useEffect } from 'react';
import { CurrencyEuroIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function SideNav() {
  const { data: session } = useSession();
  const [credits, setCredits] = useState(0);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch credits');
      }

      setCredits(data.credits);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const handleBuyCredits = async () => {
    try {
      setIsLoadingCheckout(true);
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
          {/* Credits and Recharge Button */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center bg-blue-50 px-4 py-2 rounded-md border border-blue-100">
              <CurrencyEuroIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">{credits.toFixed(2)}€</span>
            </div>
            <button
              onClick={handleBuyCredits}
              disabled={isLoadingCheckout}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingCheckout ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Chargement...
                </>
              ) : (
                'Recharger mon solde'
              )}
            </button>
          </div>
          {/* Profile Menu */}
          {session?.user?.email && (
            <ProfileMenu email={session.user.email} />
          )}
        </div>
      </div>
    </div>
  );
}