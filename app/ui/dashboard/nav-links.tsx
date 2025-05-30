'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  HomeIcon,
  RocketLaunchIcon,
  ComputerDesktopIcon,
  PhoneIcon,
  ClockIcon,
  EnvelopeIcon,
  SparklesIcon,
  ChevronDownIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';


interface NavLinksProps {
  isCollapsed?: boolean;
}

export default function NavLinks({ isCollapsed = false }: NavLinksProps) {
  const pathname = usePathname();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Email - IA', 'Téléphonie - IA']); // Default expanded menus
  const { data: session } = useSession();

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(item => item !== menuName) 
        : [...prev, menuName]
    );
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
      name: 'Email - IA',
      href: '#',
      icon: EnvelopeIcon,
      bgClass: 'bg-indigo-400/10 text-indigo-600',
      activeClass: 'bg-indigo-50 text-indigo-600 border-indigo-600',
      isParent: true,
      subItems: [
        {
          name: 'Mes Emails',
          href: '/dashboard/emails',
          icon: EnvelopeIcon,
          bgClass: 'bg-indigo-400/10 text-indigo-600',
          activeClass: 'bg-indigo-50 text-indigo-600 border-indigo-600'
        },
        {
          name: 'Nouveau message',
          href: '/dashboard/emails/new',
          icon: PaperAirplaneIcon,
          bgClass: 'bg-indigo-400/10 text-indigo-600',
          activeClass: 'bg-indigo-50 text-indigo-600 border-indigo-600'
        },
        {
          name: 'Agents IA',
          href: '/dashboard/emails/ai-agents',
          icon: SparklesIcon,
          bgClass: 'bg-indigo-400/10 text-indigo-600',
          activeClass: 'bg-indigo-50 text-indigo-600 border-indigo-600'
        }
      ]
    },
    {
      name: 'Téléphonie - IA',
      href: '#',
      icon: DevicePhoneMobileIcon,
      bgClass: 'bg-emerald-400/10 text-emerald-600',
      activeClass: 'bg-emerald-50 text-emerald-600 border-emerald-600',
      isParent: true,
      subItems: [
        { 
          name: 'Agents IA', 
          href: '/dashboard/ai-agents', 
          icon: ComputerDesktopIcon,
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
          name: 'Historique des appels', 
          href: '/dashboard/call-history', 
          icon: ClockIcon,
          bgClass: 'bg-rose-400/10 text-rose-600',
          activeClass: 'bg-rose-50 text-rose-600 border-rose-600'
        },
        { 
          name: 'Mes Campagnes', 
          href: '/dashboard/campaigns', 
          icon: RocketLaunchIcon,
          bgClass: 'bg-amber-400/10 text-amber-600',
          activeClass: 'bg-amber-50 text-amber-600 border-amber-600'
        },
      ]
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2 md:items-stretch">
      {links.map((link) => {
        const LinkIcon = link.icon;
        const isActive = link.isParent 
          ? link.subItems?.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
          : link.href === '/dashboard' 
            ? pathname === '/dashboard' // Exact match for dashboard home
            : pathname === link.href || pathname.startsWith(link.href + '/');
        const hasSubItems = link.subItems && link.subItems.length > 0;
        const isExpanded = expandedMenus.includes(link.name);
        
        return (
          <div className="relative group w-full" key={link.name}>
            <div className="flex items-center">
              {link.isParent ? (
                <button
                  onClick={() => toggleMenu(link.name)}
                  className={clsx(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 flex-grow',
                    'hover:shadow-sm hover:-translate-y-[1px]',
                    isCollapsed ? 'justify-center' : 'justify-start',
                    {
                      [link.activeClass + (isCollapsed ? '' : ' border-l-4')]: isActive,
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
                  {!isCollapsed && <span className="truncate">{link.name}</span>}
                  
                  {/* Active indicator for parent items */}
                  {isActive && !isCollapsed && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-current" />
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
                    link.bgClass.includes('indigo') && 'from-indigo-400/0 via-indigo-400/5 to-indigo-400/0',
                    'group-hover:opacity-100'
                  )} />
                </button>
              ) : (
                <Link
                  href={link.href}
                  className={clsx(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200',
                    'hover:shadow-sm hover:-translate-y-[1px]',
                    isCollapsed ? 'justify-center' : 'justify-start',
                    isCollapsed ? 'w-14' : 'flex-grow',
                    {
                      [link.activeClass + (isCollapsed ? '' : ' border-l-4')]: isActive,
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
                  {!isCollapsed && <span className="truncate">{link.name}</span>}
                  
                  {/* Active indicator for parent items */}
                  {isActive && !isCollapsed && link.isParent && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-current" />
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
                    link.bgClass.includes('indigo') && 'from-indigo-400/0 via-indigo-400/5 to-indigo-400/0',
                    'group-hover:opacity-100'
                  )} />
                </Link>
              )}

              {/* Expandable menu toggle - only for parent items that aren't in collapsed mode */}
              {hasSubItems && !link.isParent && !isCollapsed && (
                <button 
                  onClick={() => toggleMenu(link.name)}
                  className={clsx(
                    "p-2 text-gray-500 transition-colors",
                    isExpanded ? "text-indigo-600" : "text-gray-400",
                    "hover:text-indigo-600"
                  )}
                >
                  <ChevronDownIcon
                    className={clsx(
                      "h-4 w-4 transition-transform",
                      isExpanded ? "rotate-180" : "rotate-0"
                    )}
                  />
                </button>
              )}
            </div>

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className={clsx(
                'absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap z-50',
                'transition-opacity duration-200',
                showTooltip === link.name ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}>
                {link.name}
                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
              </div>
            )}

            {/* Subitems for expanded menu */}
            {hasSubItems && isExpanded && !isCollapsed && (
              <div className="pl-10 mt-1 space-y-1">
                {link.subItems.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isSubActive = pathname === subItem.href || 
                    (pathname.startsWith(subItem.href + '/') && 
                     // Special case for exact paths to avoid overlapping active states
                     !(subItem.href === '/dashboard/emails' && 
                       pathname.startsWith('/dashboard/emails/') && 
                       pathname !== '/dashboard/emails'));
                  
                  return (
                    <Link
                      key={subItem.name}
                      href={subItem.href}
                      className={clsx(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        isSubActive ? 
                          (subItem.activeClass ? subItem.activeClass.replace('border-', '') : 'bg-indigo-50 text-indigo-600') : 
                          'text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      <SubIcon className="h-4 w-4" />
                      <span className="truncate">{subItem.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
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