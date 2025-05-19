'use client';

import {
  HomeIcon,
  RocketLaunchIcon,
  ComputerDesktopIcon,
  PhoneIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function NavLinks() {
  const pathname = usePathname();

  const links = [
    { name: 'Accueil', href: '/dashboard', icon: HomeIcon },
    { name: 'Agents IA', href: '/dashboard/ai-agents', icon: ComputerDesktopIcon },
    { name: 'Mes numéros', href: '/dashboard/phone-numbers', icon: PhoneIcon },
    { name: 'Mes Campagnes', href: '/dashboard/campaigns', icon: RocketLaunchIcon },
    { name: 'Historique des appels', href: '/dashboard/call-history', icon: ClockIcon },
  ];

  return (
    <div className="relative">
      {links.map((link) => {
        const IconComponent = link.icon;
        return (
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
    </div>
  );
}