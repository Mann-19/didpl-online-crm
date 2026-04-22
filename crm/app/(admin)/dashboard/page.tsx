'use client';

import Link from 'next/link';
import { Users, FolderKanban, UserCheck, IndianRupee, ArrowRight, Clock, Coins, User, BarChart3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getDashboardStats } from './actions';
import { formatNumber } from '@/utils/formatNumber';

export default function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [stats, setStats] = useState<any>({
    totalClients: 0,
    totalProjects: 0,
    totalConsultants: 0,
    totalRevenue: 0,
    recentBookings: []
  });
  const [loading, setLoading] = useState(true);

  // Generate years list (Current year down to 2024 + 'All')
  const yearsList = [];
  for (let i = currentYear; i >= 2024; i--) {
    yearsList.push(i.toString());
  }
  yearsList.push('All');

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await getDashboardStats(selectedYear);
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedYear]);

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${formatNumber(value / 10000000)} Cr`;
    if (value >= 100000) return `₹${formatNumber(value / 100000)} L`;
    return `₹${formatNumber(value)}`;
  };

  const statCards = [
    { label: 'Total Clients', value: stats.totalClients, icon: Users, href: '/clients', accent: 'blue' },
    { label: 'Projects', value: stats.totalProjects, icon: FolderKanban, href: '/projects', accent: 'violet' },
    { label: 'Consultants', value: stats.totalConsultants, icon: UserCheck, href: '/consultants', accent: 'amber' },
  ];

  const accentStyles: Record<string, { bg: string, icon: string, border: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', border: 'hover:border-blue-200' },
    violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', border: 'hover:border-violet-200' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', border: 'hover:border-amber-200' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', border: 'hover:border-emerald-200' },
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', border: 'hover:border-indigo-200' },
    teal: { bg: 'bg-teal-50', icon: 'bg-teal-100 text-teal-600', border: 'hover:border-teal-200' },
  };

  const quickLinks = [
    { title: 'Clients', description: 'Manage client database and track information', icon: Users, href: '/clients', accent: 'blue' },
    { title: 'Projects', description: 'View plots, layouts, and project summaries', icon: FolderKanban, href: '/projects', accent: 'violet' },
    { title: 'Consultants', description: 'Manage profiles, commissions, and certificates', icon: UserCheck, href: '/consultants', accent: 'amber' },
  ];

  const quickLinks2 = [
    { title: 'Investors', description: 'Manage investor database and tracking', icon: Coins, href: '/investors', accent: 'indigo' },
    { title: 'Reports', description: 'View financial and booking summaries', icon: BarChart3, href: '/reports', accent: 'emerald' },
    { title: 'Employees', description: 'Manage staff profiles and details', icon: User, href: '/employees', accent: 'teal' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const styles = accentStyles[stat.accent];
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`bg-white rounded-lg border border-gray-200 p-5 ${styles.border} hover:shadow-sm transition-all`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">
                    {loading ? '...' : stat.value}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${styles.icon} flex items-center justify-center`}>
                  <Icon size={20} />
                </div>
              </div>
            </Link>
          );
        })}

        {/* Collection Card (Custom with Dropdown) */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 hover:border-emerald-200 hover:shadow-sm transition-all">
          <div className="flex items-start justify-between">
            <div className="w-full">
              <div className="flex justify-between items-start w-full">
                <p className="text-sm text-gray-500">Collection</p>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-gray-50 text-gray-900 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {yearsList.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <Link href="/reports" className="block mt-1">
                <p className="text-2xl font-semibold text-gray-900 hover:text-emerald-600 transition-colors tabular-nums">
                  {loading ? '...' : formatCurrency(stats.totalRevenue)}
                </p>
              </Link>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 ml-3">
              <IndianRupee size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            const styles = accentStyles[item.accent];
            return (
              <Link key={item.title} href={item.href} className={`bg-white rounded-lg border border-gray-200 p-5 ${styles.border} hover:shadow-sm transition-all group`}>
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-lg ${styles.icon} flex items-center justify-center mb-3`}>
                    <Icon size={20} />
                  </div>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              </Link>
            );
          })}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
          {quickLinks2.map((item) => {
            const Icon = item.icon;
            const styles = accentStyles[item.accent];
            return (
              <Link key={item.title} href={item.href} className={`bg-white rounded-lg border border-gray-200 p-5 ${styles.border} hover:shadow-sm transition-all group`}>
                <div className="flex items-center gap-8 justify-between">
                  <div className="flex items-center gap-6">
                    <div className={`w-10 h-10 rounded-lg ${styles.icon} flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-gray-500" />
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 text-center py-8">Loading activity...</div>
        ) : stats.recentBookings.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">No recent bookings found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stats.recentBookings.map((booking: any) => (
              <div key={booking.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {booking.clients?.name} booked Plot {booking.plots?.plot_number}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {booking.plots?.projects?.name} • {new Date(booking.booking_date).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded font-medium capitalize 
                  ${booking.status === 'confirmed' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
