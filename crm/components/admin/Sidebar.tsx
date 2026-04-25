'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Home, Users, FolderKanban, UserCheck,
  User, Coins, BarChart3, LogOut,
  ChevronLeft, ReceiptText
} from 'lucide-react';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userProfile: any;
}

export default function Sidebar({ isOpen, setIsOpen, userProfile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', icon: Home, href: '/dashboard', roles: ['admin', 'employee'] },
    { name: 'Team Members', icon: User, href: '/employees', roles: ['admin'] },
    { name: 'Investors', icon: Coins, href: '/investors', roles: ['admin'] },
    { name: 'Consultants', icon: UserCheck, href: '/consultants', roles: ['admin', 'employee'] },
    { name: 'Clients', icon: Users, href: '/clients', roles: ['admin', 'employee'] },
    { name: 'Projects', icon: FolderKanban, href: '/projects', roles: ['admin', 'employee'] },
    { name: 'Reports', icon: BarChart3, href: '/reports', roles: ['admin', 'employee'] },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      className={`${isOpen ? 'translate-x-0 w-64 md:w-60' : '-translate-x-full md:translate-x-0 md:w-20'
        } fixed md:relative z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col shrink-0`}
    >
      {/* Logo Section */}
      <div className={`h-16 flex items-center ${isOpen ? 'justify-between' : 'justify-center'} px-4 border-b border-gray-200`}>
        {isOpen ? (
          <div className="flex items-center gap-2">
            <Image src="/DIDPL-LOGO.png" alt="Logo" width={40} height={40} className="object-contain" priority />
            <span className="font-semibold text-gray-800 text-base">DIDPL CRM</span>
          </div>
        ) : (
          <button onClick={() => setIsOpen(true)} className="hidden md:block p-1 hover:bg-gray-100 rounded-md">
            <Image src="/DIDPL-LOGO.png" alt="Logo" width={32} height={32} className="object-contain" />
          </button>
        )}

        {isOpen && (
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems
          .filter(item => !item.roles || (userProfile && item.roles.includes(userProfile.role)))
          .map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${active
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                title={!isOpen ? item.name : ''}
              >
                <Icon size={20} className="shrink-0" />
                {isOpen && <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
      </nav>

      {/* User Profile Section */}
      {isOpen && userProfile && (
        <div className="block px-4 py-3 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-teal-700">
                {userProfile.full_name ? userProfile.full_name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile.full_name || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500 capitalize truncate">
                {userProfile.role} Account
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          title={!isOpen ? "Logout" : ''}
        >
          <LogOut size={20} className="shrink-0" />
          {isOpen && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
