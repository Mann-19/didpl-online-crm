'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map, List, Users } from 'lucide-react';

export default function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  // Define routes
  const routes = [
    {
      label: 'Overview',
      href: `/projects/${projectId}`,
      icon: LayoutDashboard,
      active: pathname === `/projects/${projectId}`
    },
    {
      label: 'Interactive Layout',
      href: `/projects/${projectId}/layout`,
      icon: Map,
      active: pathname.includes('/layout')
    },
    {
      label: 'Plots List',
      href: `/projects/${projectId}/list`,
      icon: List,
      active: pathname.includes('/list')
    },
    {
      label: 'Clients',
      href: `/projects/${projectId}/clients`,
      icon: Users,
      active: pathname.includes('/clients')
    }
  ];

  return (
    <div className="border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide">
      <nav className="flex space-x-4 md:space-x-8 min-w-max px-1" aria-label="Project Navigation">
        {routes.map((route) => {
          const Icon = route.icon;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap
                ${route.active
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <Icon className={`
                mr-2 h-4 w-4 transition-colors
                ${route.active ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-500'}
              `} />
              {route.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
