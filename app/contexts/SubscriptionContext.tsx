'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface UserSubscription {
  plan: string;
  status: string;
  autoRenew: boolean;
}

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  isLoading: boolean;
  refetchSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!session?.user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/stripe/subscription');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscription');
      }

      setSubscription(data.subscription);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [session]);

  const value = {
    subscription,
    isLoading,
    refetchSubscription: fetchSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
} 