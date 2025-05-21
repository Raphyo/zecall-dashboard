'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, PowerIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useSubscription } from '@/app/contexts/SubscriptionContext';

interface ProfileMenuProps {
  email: string;
}

function getPackageNameInFrench(packageName: string) {
  switch (packageName?.toLowerCase()) {
    case 'essential':
      return 'Essentiel';
    case 'professional':
      return 'Professionnel';
    case 'premium':
      return 'Premium';
    default:
      return packageName || 'Standard';
  }
}

function getSubscriptionStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-50 text-green-700 ring-green-600/20';
    case 'canceled':
    case 'cancelled':
      return 'bg-red-50 text-red-700 ring-red-600/20';
    case 'trialing':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    default:
      return 'bg-gray-50 text-gray-600 ring-gray-500/10';
  }
}

function getSubscriptionStatusLabel(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'Actif';
    case 'canceled':
    case 'cancelled':
      return 'Résilié';
    case 'trialing':
      return 'Période d\'essai';
    default:
      return status || 'Inconnu';
  }
}

export default function ProfileMenu({ email }: ProfileMenuProps) {
  const { subscription, isLoading, setShowUpgradeModal } = useSubscription();
  
  const handleSignOut = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/login'
    });
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="inline-flex w-full items-center gap-x-1 text-sm font-semibold leading-6 text-gray-900">
        {email}
        <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-[-50px] bottom-full mb-2 z-50 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {/* Subscription Section */}
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-gray-500 mb-2">Abonnement</div>
              {isLoading ? (
                <div className="text-sm text-gray-500">Chargement...</div>
              ) : subscription?.status === 'expired' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">Aucun forfait actif</span>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getSubscriptionStatusStyle('expired')}`}>
                      Expiré
                    </span>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="mt-2 block w-full text-left text-xs text-blue-600 hover:text-blue-700"
                  >
                    Choisir un forfait →
                  </button>
                </div>
              ) : subscription ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      Forfait {getPackageNameInFrench(subscription.plan)}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getSubscriptionStatusStyle(subscription.status)}`}>
                      {getSubscriptionStatusLabel(subscription.status)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {subscription.autoRenew ? 'Renouvellement automatique activé' : 'Renouvellement automatique désactivé'}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Aucun abonnement actif</div>
              )}
            </div>

            <div className="border-t border-gray-200">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    href="/dashboard/profile"
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } block px-4 py-2 text-sm`}
                  >
                    Général
                  </Link>
                )}
              </Menu.Item>
            </div>

            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/dashboard/billing"
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } block px-4 py-2 text-sm`}
                >
                  Factures
                </Link>
              )}
            </Menu.Item>
            <div className="border-t border-gray-200">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleSignOut}
                    className={`${
                      active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    } block w-full px-4 py-2 text-left text-sm`}
                  >
                    <div className="flex items-center">
                      <PowerIcon className="h-4 w-4 mr-2" />
                      Déconnexion
                    </div>
                  </button>
                )}
              </Menu.Item>
            </div>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
} 