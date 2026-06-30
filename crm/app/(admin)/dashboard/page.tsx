'use client';

import Link from 'next/link';
import {
  Users, FolderKanban, UserCheck, IndianRupee,
  UserPlus, BarChart3, Bell, TrendingUp,
  ChevronRight, Building2, Layers, MapPin,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  RadialBarChart, RadialBar, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Legend,
} from 'recharts';
import { getDashboardStats } from './actions';
import { formatNumber } from '@/utils/formatNumber';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  if (value >= 10000000) return `₹${formatNumber(value / 10000000)} Cr`;
  if (value >= 100000) return `₹${formatNumber(value / 100000)} L`;
  return `₹${formatNumber(value)}`;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />;
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderAccent: string;
  loading: boolean;
  href?: string;
}

function KpiCard({ label, value, sub, icon: Icon, iconBg, iconColor, borderAccent, loading, href }: KpiCardProps) {
  const inner = (
    <div className={`relative bg-white rounded-xl border border-gray-200 p-5 transition-all duration-200 hover:shadow-md hover:${borderAccent} group overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${iconBg} opacity-60`} />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <div className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums leading-none">
            {loading ? <Skeleton className="h-7 w-24 mt-1" /> : value}
          </div>
          {sub && !loading && (
            <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0 ml-3 transition-transform duration-200 group-hover:scale-110`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ─── Quick Action ────────────────────────────────────────────────────────────

interface QuickActionProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  accent: string;
}

function QuickAction({ href, icon: Icon, label, description, accent }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
    >
      <div className={`w-9 h-9 rounded-lg ${accent} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
        <Icon size={17} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 leading-tight">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-tight truncate">{description}</p>
      </div>
      <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
    </Link>
  );
}

// ─── Mini Donut (per project card) ──────────────────────────────────────────

function MiniDonut({ sold, engaged, available }: { sold: number; engaged: number; available: number }) {
  const total = sold + engaged + available;
  if (total === 0) return <div className="w-16 h-16 rounded-full bg-gray-100" />;

  const data = [
    { name: 'Sold', value: sold, color: '#10b981' },
    { name: 'Engaged', value: engaged, color: '#f59e0b' },
    { name: 'Available', value: available, color: '#e5e7eb' },
  ].filter(d => d.value > 0);

  return (
    <PieChart width={64} height={64}>
      <Pie
        data={data}
        cx={28}
        cy={28}
        innerRadius={18}
        outerRadius={30}
        dataKey="value"
        strokeWidth={1}
        stroke="white"
        startAngle={90}
        endAngle={-270}
      >
        {data.map((entry, i) => (
          <Cell key={i} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  );
}

// ─── Project Analytics Card ──────────────────────────────────────────────────

interface ProjectData {
  id: string;
  name: string;
  location: string;
  status: string;
  totalPlots: number;
  soldPlots: number;
  fullyPaidPlots: number;
  tokenPlots: number;
  availablePlots: number;
  amountReceived: number;
  totalRevenue: number;
  collectionRate: number;
}

function ProjectAnalyticsCard({ project }: { project: ProjectData }) {
  const negotiationsCount = project.fullyPaidPlots + project.tokenPlots;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
              <Building2 size={14} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-700 transition-colors">
              {project.name}
            </h3>
          </div>
          {project.location && (
            <div className="flex items-center gap-1 mt-1.5 ml-9">
              <MapPin size={11} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-400 truncate">{project.location}</span>
            </div>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
          project.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {project.status}
        </span>
      </div>

      {/* Donut + Stats */}
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <MiniDonut
            sold={project.soldPlots}
            engaged={negotiationsCount}
            available={project.availablePlots}
          />
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-base font-bold text-emerald-600 tabular-nums">{project.soldPlots}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sold</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-amber-500 tabular-nums">{negotiationsCount}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Negotiations</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-gray-400 tabular-nums">{project.availablePlots}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Available</p>
          </div>
        </div>
      </div>

      {/* Financial footer */}
      <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-gray-400">Collected</p>
          <p className="text-sm font-semibold text-gray-900 tabular-nums mt-0.5">
            {formatCurrency(project.amountReceived)}
          </p>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-gray-400">Collection Rate</p>
            <p className={`text-xs font-bold tabular-nums ${
              project.collectionRate >= 70 ? 'text-emerald-600' :
              project.collectionRate >= 40 ? 'text-amber-600' : 'text-gray-500'
            }`}>{project.collectionRate.toFixed(1)}%</p>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                project.collectionRate >= 70 ? 'bg-emerald-500' :
                project.collectionRate >= 40 ? 'bg-amber-400' : 'bg-gray-400'
              }`}
              style={{ width: `${Math.min(project.collectionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex-1"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-20" /></div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[1,2,3].map(i => <div key={i}><Skeleton className="h-5 w-8 mx-auto mb-1" /><Skeleton className="h-3 w-10 mx-auto" /></div>)}
        </div>
      </div>
      <div className="border-t border-gray-100 pt-3 flex gap-3">
        <div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-4 w-20" /></div>
        <div className="flex-1"><Skeleton className="h-3 w-full mb-2" /><Skeleton className="h-1.5 w-full rounded-full" /></div>
      </div>
    </div>
  );
}

// ─── Portfolio Chart Section ─────────────────────────────────────────────────

const CURRENCY_TICK = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
  return `₹${value}`;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CollectionTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mt-1">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PlotStatusTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-800">{name}</p>
      <p className="text-gray-500 mt-0.5">{value} plots</p>
    </div>
  );
}

function PortfolioCharts({ projects, loading }: { projects: ProjectData[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <Skeleton className="h-5 w-40 mb-1" /><Skeleton className="h-3 w-56 mb-6" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <Skeleton className="h-5 w-40 mb-1" /><Skeleton className="h-3 w-56 mb-6" />
          <Skeleton className="h-52 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!projects.length) return null;

  // Bar chart data: collection per project
  const collectionData = projects.map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    fullName: p.name,
    Collected: p.amountReceived,
    Pending: Math.max(0, p.totalRevenue - p.amountReceived),
  }));

  // Aggregate plot status for overall donut
  const totalSold = projects.reduce((s, p) => s + p.soldPlots, 0);
  const totalEngaged = projects.reduce((s, p) => s + p.fullyPaidPlots + p.tokenPlots, 0);
  const totalAvailable = projects.reduce((s, p) => s + p.availablePlots, 0);
  const donutData = [
    { name: 'Sold', value: totalSold, color: '#10b981' },
    { name: 'Negotiations', value: totalEngaged, color: '#f59e0b' },
    { name: 'Available', value: totalAvailable, color: '#e2e8f0' },
  ].filter(d => d.value > 0);
  const totalPlots = totalSold + totalEngaged + totalAvailable;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Collection Bar Chart — wider */}
      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800">Collection vs Pending</h3>
        <p className="text-xs text-gray-400 mt-0.5 mb-5">Amount collected vs outstanding per project</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={collectionData} barSize={28} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={CURRENCY_TICK}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CollectionTooltip />} cursor={{ fill: '#f9fafb', radius: 6 }} />
            <Bar dataKey="Collected" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
            <Bar dataKey="Pending" stackId="a" fill="#fde68a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Collected
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm bg-yellow-200" /> Outstanding
          </span>
        </div>
      </div>

      {/* Overall Plot Status Donut — narrower */}
      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-800">Overall Plot Inventory</h3>
        <p className="text-xs text-gray-400 mt-0.5 mb-3">Combined status across all projects</p>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative">
            <PieChart width={180} height={180}>
              <Pie
                data={donutData}
                cx={86}
                cy={86}
                innerRadius={52}
                outerRadius={82}
                dataKey="value"
                strokeWidth={2}
                stroke="white"
                startAngle={90}
                endAngle={-270}
              >
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PlotStatusTooltip />} />
            </PieChart>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xl font-bold text-gray-900 tabular-nums">{totalPlots}</p>
              <p className="text-[10px] text-gray-400 font-medium">Total Plots</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 mt-2 w-full max-w-[160px]">
            {donutData.map((d) => {
              const pct = totalPlots > 0 ? ((d.value / totalPlots) * 100).toFixed(1) : '0';
              return (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color, border: d.color === '#e2e8f0' ? '1px solid #d1d5db' : undefined }} />
                    <span className="text-xs text-gray-600">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-800 tabular-nums">{d.value}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // Hardcoded to avoid server/client new Date() mismatch
  const currentYear = 2026;
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const yearsList: string[] = [];
  for (let i = currentYear; i >= 2024; i--) yearsList.push(i.toString());
  yearsList.push('All');

  useEffect(() => {
    setLoading(true);
    getDashboardStats(selectedYear)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedYear]);

  const [dateLabel, setDateLabel] = useState<string>('');

  // Populate date only on client to avoid SSR hydration mismatch
  useEffect(() => {
    setDateLabel(new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }));
  }, []);

  const kpiCards: KpiCardProps[] = [
    {
      label: 'Total Clients',
      value: loading ? '—' : stats?.totalClients ?? 0,
      sub: 'Registered in CRM',
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderAccent: 'border-blue-200',
      loading,
      href: '/clients/list',
    },
    {
      label: 'Active Projects',
      value: loading ? '—' : stats?.totalProjects ?? 0,
      sub: 'Ongoing developments',
      icon: FolderKanban,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      borderAccent: 'border-violet-200',
      loading,
      href: '/projects',
    },
    {
      label: 'Consultants',
      value: loading ? '—' : stats?.totalConsultants ?? 0,
      sub: 'Active channel partners',
      icon: UserCheck,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderAccent: 'border-amber-200',
      loading,
      href: '/consultants',
    },
    {
      label: selectedYear === 'All' ? 'Total Collection' : `${selectedYear} Collection`,
      value: loading ? '—' : formatCurrency(stats?.totalRevenue ?? 0),
      sub: loading ? '' : `₹${formatCurrency(stats?.totalPendingBalance ?? 0)} pending balance`,
      icon: IndianRupee,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderAccent: 'border-emerald-200',
      loading,
      href: '/reports',
    },
  ];

  const quickActions: QuickActionProps[] = [
    { href: '/clients/new', icon: UserPlus, label: 'Add Client', description: 'Register a new client', accent: 'bg-blue-100 text-blue-600' },
    { href: '/projects', icon: Layers, label: 'Projects & Plots', description: 'Manage bookings & plots', accent: 'bg-violet-100 text-violet-600' },
    { href: '/reports', icon: BarChart3, label: 'Reports', description: 'Ledger, bookings & more', accent: 'bg-emerald-100 text-emerald-600' },
    { href: '/approvals', icon: Bell, label: 'Approvals', description: 'Review pending changes', accent: 'bg-amber-100 text-amber-600' },
    { href: '/consultants', icon: UserCheck, label: 'Consultants', description: 'Commissions & profiles', accent: 'bg-rose-100 text-rose-600' },
    { href: '/clients/list', icon: Users, label: 'All Clients', description: 'Search & browse clients', accent: 'bg-teal-100 text-teal-600' },
  ];

  return (
    <div className="space-y-7 animate-in fade-in duration-300 pb-8">

      {/* ── Welcome Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">DIDPL Real Estate CRM &nbsp;·&nbsp; {dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 font-medium">Year</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer transition-all"
          >
            {yearsList.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => <KpiCard key={card.label} {...card} />)}
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => <QuickAction key={action.href} {...action} />)}
        </div>
      </div>

      {/* ── Portfolio Charts ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Portfolio Overview</h2>
            <p className="text-xs text-gray-400 mt-0.5">Financial & inventory analytics across all projects</p>
          </div>
          <Link href="/reports" className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
            Reports <ChevronRight size={13} />
          </Link>
        </div>
        <PortfolioCharts projects={stats?.projectsData ?? []} loading={loading} />
      </div>

      {/* ── Project Analytics Cards ────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Breakdown</h2>
            <p className="text-xs text-gray-400 mt-0.5">Plot status & collection rate per project</p>
          </div>
          <Link href="/projects" className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium transition-colors">
            View All <ChevronRight size={13} />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <ProjectCardSkeleton key={i} />)}
          </div>
        ) : !stats?.projectsData?.length ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            No projects found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.projectsData.map((project: ProjectData) => (
              <ProjectAnalyticsCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
