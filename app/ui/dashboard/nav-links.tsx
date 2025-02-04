'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  HomeIcon,
  RocketLaunchIcon,
  CreditCardIcon,
  UserCircleIcon,
  ComputerDesktopIcon,
  PhoneIcon,
  ClockIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

// Add list of users with locked features
const LOCKED_USERS = [
  'raphaelvannerom@gmail.com',
  'rvannerom@zecall.ai',
  'team.zecall@gmail.com',
  // 'sachalellouche@gmail.com',
  'slellouche@zecall.ai',
  'dcambon.spi@gmail.com',
  'contact@ilcaffeditalia.fr',
//   'david.diouf@hotmail.fr',
  'info.formationcanine@gmail.com',
  'julien.volkmann@gmail.com'
  // Add more emails as needed
];

// Add list of features that can be locked
const LOCKED_FEATURES = ['campaigns', 'ai-agents'];

export default function NavLinks() {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState(false);
  const { data: session } = useSession();

  const isFeatureLocked = (feature: string) => {
    const userEmail = session?.user?.email;
    return userEmail && LOCKED_USERS.includes(userEmail) && LOCKED_FEATURES.includes(feature);
  };

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3000);
  };

  const links = [
    { name: 'Accueil', href: '/dashboard', icon: HomeIcon },
    { 
      name: 'Agents IA', 
      href: '/dashboard/ai-agents', 
      icon: ComputerDesktopIcon,
      locked: isFeatureLocked('ai-agents'),
      onClick: handleLockedClick
    },
    { 
      name: 'Mes Campagnes', 
      href: '/dashboard/campaigns',
      icon: RocketLaunchIcon,
      locked: isFeatureLocked('campaigns'),
      onClick: handleLockedClick
    },
    { name: 'Mes numéros', href: '/dashboard/phone-numbers', icon: PhoneIcon },
    { name: 'Historique des appels', href: '/dashboard/call-history', icon: ClockIcon },
    // { name: 'Facturation', href: '/dashboard/billing', icon: CreditCardIcon },
    { name: 'Profil', href: '/dashboard/profile', icon: UserCircleIcon },
  ];

  return (
    <div className="relative">
      {links.map((link) => {
        const IconComponent = link.icon;
        return link.locked ? (
          <button
            key={link.name}
            onClick={link.onClick}
            className={clsx(
              'flex h-[48px] w-full grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium text-gray-400 md:flex-none md:justify-start md:p-2 md:px-3',
              'cursor-not-allowed'
            )}
          >
            <IconComponent className="w-6" />
            <p className="hidden md:block">{link.name}</p>
            <LockClosedIcon className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <Link
            key={link.name}
            href={link.href}
            className={clsx(
              'flex h-[48px] grow items-center justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3',
              {
                'bg-sky-100 text-blue-600': pathname === link.href,
              },
            )}
          >
            <IconComponent className="w-6" />
            <p className="hidden md:block">{link.name}</p>
          </Link>
        );
      })}
      
      {showTooltip && (
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-12 bg-gray-800 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap">
          Cette fonctionnalité n'est pas encore disponible
        </div>
      )}
    </div>
  );
}