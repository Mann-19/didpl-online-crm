import { getProjectOverview, getProjectClients } from '../../../projects.actions';
import ProjectNav from '@/components/projects/ProjectNav';
import BackLink from '@/components/ui/BackLink';
import { notFound } from 'next/navigation';
import { Users, Phone, MapPin } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import Link from 'next/link';

export default async function ProjectClientsPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const projectId = resolvedParams.id;
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
  
  const [overview, clients] = await Promise.all([
    getProjectOverview(projectId),
    getProjectClients(projectId, status)
  ]);

  if (!overview) {
    notFound();
  }

  const { project } = overview;

  return (
    <div className="min-h-screen bg-gray-50 font-sans animate-in fade-in duration-300 flex flex-col">
      <div className="max-w-7xl mx-auto w-full px-6 pt-4">
        {/* Header Area */}
        <div className="mb-2">
          <BackLink href="/projects" dirname="All Projects" accent="violet" />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-violet-600 mb-1 uppercase tracking-wider">{project.name}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                {status === 'sold' 
                  ? 'Sold Clients' 
                  : status === 'confirmed' 
                    ? 'Confirmed Clients' 
                    : status === 'token_paid' 
                      ? 'Token Paid Clients' 
                      : 'All Client Bookings'}
              </h1>
              <p className="text-gray-500 mt-1">Total matching records: {clients.length}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ProjectNav projectId={projectId} />

        {/* Clients Grid */}
        <div className="mt-6">
          {clients.length > 0 ? (
            <div className="space-y-4">
              {clients.map((item: any, index: number) => {
                const client = item.client;
                const plots = item.plots;

                return (
                  <details key={client.id || index} className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                          {client.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{client.name}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                            <span>{client.client_code || 'No Code'}</span>
                            {client.phone && (
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>
                            )}
                            {(client.residential_city || client.residential_state) && (
                              <span className="flex items-center gap-1 hidden sm:flex">
                                <MapPin className="w-3 h-3" /> 
                                {[client.residential_city, client.residential_state].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold border border-violet-200 shadow-sm">
                          {plots.length} Plot{plots.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </summary>
                    
                    <div className="border-t border-gray-100 bg-gray-50/50">
                      <div className="divide-y divide-gray-200">
                        {plots.map((plot: any, idx: number) => {
                          const deal = plot._dealTotal || 0;
                          const paid = plot._paidTotal || 0;
                          const balance = deal - paid;
                          const progress = deal > 0 ? Math.min(100, (paid / deal) * 100) : 0;
                          
                          return (
                            <div key={idx} className="p-4 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 hover:bg-white transition-colors">
                              <div className="w-full lg:w-1/4">
                                <div className="inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200 mb-1">
                                  Plot {plot._plotNumber}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">
                                  {plot.booking_status !== 'none' ? `Booking: ${plot.booking_status}` : `Status: ${plot.status}`}
                                </div>
                              </div>
                              
                              <div className="w-full lg:w-3/4 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
                                <div className="flex gap-8 shrink-0">
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Plot Price</p>
                                    <p className="font-semibold text-gray-900">₹{formatNumber(deal)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Amount Paid</p>
                                    <p className="font-semibold text-emerald-600">₹{formatNumber(paid)}</p>
                                  </div>
                                </div>
                                
                                <div className="w-full sm:max-w-xs">
                                  <div className="flex justify-between text-xs mb-1.5">
                                    <span className="font-medium text-orange-600">Due: ₹{formatNumber(Math.max(0, balance))}</span>
                                    <span className="text-gray-500 font-medium">{formatNumber(progress)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="p-3 border-t border-gray-200 bg-white text-center rounded-b-lg">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-block"
                        >
                          View Full Profile &rarr;
                        </Link>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No Clients Found</h3>
              <p className="text-gray-500 mt-1">There are no confirmed bookings in this project yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
