'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  HomeIcon,
  RocketLaunchIcon,
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
  // 'raphaelvannerom@gmail.com',
  // 'rvannerom@zecall.ai',
  // 'team.zecall@gmail.com',
  // 'sachalellouche@gmail.com',
  // 'slellouche@zecall.ai',
  'mohamed93420@hotmail.com',
  'dcambon.spi@gmail.com',
  'contact@ilcaffeditalia.fr',
//   'david.diouf@hotmail.fr',
  // 'actionenergetique@gmail.com',
  'julien.volkmann@gmail.com'
  // Add more emails as needed
];

// Add list of features that can be locked
const LOCKED_FEATURES = ['campaigns', 'ai-agents'];

export default function NavLinks() {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const { data: session } = useSession();

  const isFeatureLocked = (feature: string) => {
    const userEmail = session?.user?.email;
    return userEmail && LOCKED_USERS.includes(userEmail) && LOCKED_FEATURES.includes(feature);
  };

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowTooltip('locked');
    setTimeout(() => setShowTooltip(null), 3000);
  };

  const links = [
    { 
      name: 'Accueil', 
      href: '/dashboard', 
      icon: HomeIcon,
      bgClass: 'bg-blue-400/10 text-blue-600',
      activeClass: 'bg-blue-50 text-blue-600 border-blue-600'
    },
    { 
      name: 'Agents IA', 
      href: '/dashboard/ai-agents', 
      icon: ComputerDesktopIcon,
      locked: isFeatureLocked('ai-agents'),
      onClick: handleLockedClick,
      bgClass: 'bg-purple-400/10 text-purple-600',
      activeClass: 'bg-purple-50 text-purple-600 border-purple-600'
    },
    { 
      name: 'Mes numéros', 
      href: '/dashboard/phone-numbers',
      icon: PhoneIcon,
      bgClass: 'bg-emerald-400/10 text-emerald-600',
      activeClass: 'bg-emerald-50 text-emerald-600 border-emerald-600'
    },
    { 
      name: 'Mes Campagnes', 
      href: '/dashboard/campaigns', 
      icon: RocketLaunchIcon,
      locked: isFeatureLocked('campaigns'),
      onClick: handleLockedClick,
      bgClass: 'bg-amber-400/10 text-amber-600',
      activeClass: 'bg-amber-50 text-amber-600 border-amber-600'
    },
    { 
      name: 'Historique des appels', 
      href: '/dashboard/call-history', 
      icon: ClockIcon,
      bgClass: 'bg-rose-400/10 text-rose-600',
      activeClass: 'bg-rose-50 text-rose-600 border-rose-600'
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2 md:items-stretch">
      {links.map((link) => {
        const LinkIcon = link.icon;
        const isActive = pathname === link.href;
        
        if (link.locked) {
          return (
            <div className="relative group" key={link.name}>
              <button
                onClick={link.onClick}
                className={clsx(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                  'text-gray-400 cursor-not-allowed',
                  'md:justify-start',
                  'w-14 md:w-auto'
                )}
                onMouseEnter={() => setShowTooltip(link.name)}
                onMouseLeave={() => setShowTooltip(null)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <LinkIcon className="h-5 w-5" />
                </div>
                <span className="hidden md:block truncate">{link.name}</span>
                <LockClosedIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 hidden md:block" />
              </button>
              
              {/* Tooltip for collapsed state */}
              <div className={clsx(
                'absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-50',
                'transition-opacity duration-200',
                showTooltip === link.name ? 'opacity-100' : 'opacity-0 pointer-events-none',
                'md:hidden' // Only show on mobile/collapsed state
              )}>
                {link.name}
                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
              </div>
            </div>
          );
        }
        
        return (
          <div className="relative group" key={link.name}>
            <Link
              href={link.href}
              className={clsx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                'hover:shadow-sm hover:-translate-y-[1px]',
                'md:justify-start',
                'w-14 md:w-auto',
                {
                  [link.activeClass + ' border-l-4']: isActive,
                  'text-gray-600 hover:bg-gray-50': !isActive,
                },
              )}
              onMouseEnter={() => setShowTooltip(link.name)}
              onMouseLeave={() => setShowTooltip(null)}
            >
              <div className={clsx(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                isActive ? link.bgClass : 'group-hover:bg-gray-100'
              )}>
                <LinkIcon className="h-5 w-5" />
              </div>
              <span className="hidden md:block truncate">{link.name}</span>
              
              {/* Active indicator */}
              {isActive && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-current hidden md:block" />
              )}
              
              {/* Hover effect */}
              <div className={clsx(
                'absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200',
                'bg-gradient-to-r',
                link.bgClass.includes('blue') && 'from-blue-400/0 via-blue-400/5 to-blue-400/0',
                link.bgClass.includes('purple') && 'from-purple-400/0 via-purple-400/5 to-purple-400/0',
                link.bgClass.includes('emerald') && 'from-emerald-400/0 via-emerald-400/5 to-emerald-400/0',
                link.bgClass.includes('amber') && 'from-amber-400/0 via-amber-400/5 to-amber-400/0',
                link.bgClass.includes('rose') && 'from-rose-400/0 via-rose-400/5 to-rose-400/0',
                'group-hover:opacity-100'
              )} />
            </Link>

            {/* Tooltip for collapsed state */}
            <div className={clsx(
              'absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-50',
              'transition-opacity duration-200',
              showTooltip === link.name ? 'opacity-100' : 'opacity-0 pointer-events-none',
              'md:hidden' // Only show on mobile/collapsed state
            )}>
              {link.name}
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          </div>
        );
      })}
      
      {showTooltip === 'locked' && (
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-12 bg-gray-800 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap">
          Cette fonctionnalité n'est pas encore disponible
        </div>
      )}
    </div>
  );
}