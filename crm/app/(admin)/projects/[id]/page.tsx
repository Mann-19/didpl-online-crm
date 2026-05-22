import { getProjectOverview } from '../../projects.actions';
import {
  MapPin, LayoutGrid, CheckCircle2, Circle, Users,
  Wallet, TrendingUp, Activity, Edit
} from 'lucide-react';
import Link from 'next/link';
import ProjectNav from '@/components/projects/ProjectNav';
import BackLink from '@/components/ui/BackLink';
import { formatNumber } from '@/utils/formatNumber';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProjectEditButton from './ProjectEditButton';

export default async function ProjectOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  const overview = await getProjectOverview(projectId);

  if (!overview) {
    notFound();
  }

  // Fetch current user role for master_admin gating
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id ?? '').single();
  const isMasterAdmin = profile?.role === 'master_admin';

  const { project, statusCounts } = overview;
  const formatCurrency = (amount: number) => `₹${formatNumber(amount)}`;

  const statusCards = [
    { label: 'Available', count: statusCounts.available, color: 'bg-emerald-500', text: 'text-emerald-700', bgSoft: 'bg-emerald-50' },
    { label: 'Token Paid', count: statusCounts.token, color: 'bg-amber-400', text: 'text-amber-700', bgSoft: 'bg-amber-50' },
    { label: 'Sold', count: statusCounts.sold, color: 'bg-rose-600', text: 'text-rose-700', bgSoft: 'bg-rose-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header Area */}
        <div className="mb-2">
          <BackLink href="/projects" dirname="All Projects" accent="violet" />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-gray-500 text-sm">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{project.location || 'Location not specified'}</span>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <span className="w-full sm:w-auto mt-1 sm:mt-0">{project.totalAreaSqYd > 0 ? `${formatNumber(project.totalAreaSqYd)} sq.yd` : 'N/A'}</span>
                {project.pricePerUnit > 0 && (
                  <>
                    <span className="text-gray-300 hidden sm:inline">•</span>
                    <span className="w-full sm:w-auto mt-1 sm:mt-0">₹{formatNumber(project.pricePerUnit)} / sq.yd</span>
                  </>
                )}
              </div>
            </div>
            {isMasterAdmin && (
              <ProjectEditButton project={{
                id: project.id,
                name: project.name,
                location: project.location,
                description: project.description,
                total_area_sqyd: project.totalAreaSqYd,
              }} />
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <ProjectNav projectId={projectId} />

        {/* High Level Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Plots */}
          <div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Lands</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{project.totalPlots}</p>
            </div>
            <div className={`p-3 rounded-md bg-gray-100 text-gray-600`}>
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>

          {/* Sold */}
          <div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirmed</p>
              <p className="text-2xl font-bold text-violet-700 mt-1">{project.soldPlots}</p>
            </div>
            <div className={`p-3 rounded-md bg-violet-100 text-violet-600`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Available */}
          <div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Available</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{project.availablePlots}</p>
            </div>
            <div className={`p-3 rounded-md bg-emerald-100 text-emerald-600`}>
              <Circle className="w-5 h-5" />
            </div>
          </div>

          {/* Clients */}
          <Link href={`/projects/${projectId}/clients`}>
            <div className="bg-white p-5 rounded-md border border-gray-200 flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group h-full">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide group-hover:text-blue-600 transition-colors">Unique Clients</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{project.clientCount}</p>
              </div>
              <div className={`p-3 rounded-md bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors`}>
                <Users className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Overview */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
              <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-gray-400" />
                <h2 className="text-base font-bold text-gray-900">Financial Overview</h2>
              </div>

              <div className="p-4 md:p-6 space-y-6">
                {/* FINANCIAL STATS */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Value</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(project.totalRevenue)}</p>
                      <p className="text-xs text-gray-400">Project Potential</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Collected</p>
                      <p className="text-xl font-bold text-emerald-600">{formatCurrency(project.amountReceived)}</p>
                      <p className="text-xs font-medium text-emerald-600 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">
                        {formatNumber(project.collectionRate)}% Recovered
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pending</p>
                      <p className="text-xl font-bold text-rose-600">{formatCurrency(project.pendingAmount)}</p>
                      <p className="text-xs font-medium text-rose-600 bg-rose-50 inline-block px-1.5 py-0.5 rounded">
                        {formatNumber(project.pendingPercentage)}% Balance
                      </p>
                    </div>
                  </div>

                  {/* Payment Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-600">Financial Progress</span>
                      <span className="text-gray-900">{formatNumber(project.collectionRate)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(project.collectionRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* AREA STATS */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Area</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatNumber(project.totalAreaSqYd)}
                        <span className="text-sm font-normal text-gray-500 ml-1">sq.yd</span>
                      </p>
                      <p className="text-xs text-gray-400">Total Land Area</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sold Area</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatNumber(project.soldAreaSqYd)}
                        <span className="text-sm font-normal text-gray-500 ml-1">sq.yd</span>
                      </p>
                      <p className="text-xs font-medium text-blue-600 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
                        {formatNumber(project.areaPercentageSold)}% Sold
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remaining</p>
                      <p className="text-xl font-bold text-orange-600">
                        {formatNumber(project.remainingAreaSqYd)}
                        <span className="text-sm font-normal text-gray-500 ml-1">sq.yd</span>
                      </p>
                      <p className="text-xs text-gray-400">Available</p>
                    </div>
                  </div>

                  {/* Area Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-600">Sales Progress (Area)</span>
                      <span className="text-gray-900">{formatNumber(project.areaPercentageSold)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(project.areaPercentageSold, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (1/3 width) */}
          <div className="space-y-6">
            {/* Inventory Status */}
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-gray-400" />
                <h2 className="text-base font-bold text-gray-900">Inventory Status</h2>
              </div>

              <div className="p-4 space-y-2">
                {statusCards.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-md transition-colors ${item.bgSoft}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
                      <span className={`text-sm font-medium ${item.text}`}>{item.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${item.text}`}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
