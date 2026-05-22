import { getProjectOverview, getProjectClients } from '../../../projects.actions';
import ProjectNav from '@/components/projects/ProjectNav';
import BackLink from '@/components/ui/BackLink';
import { notFound } from 'next/navigation';
import { Users, Phone, MapPin } from 'lucide-react';
import { formatNumber } from '@/utils/formatNumber';
import Link from 'next/link';

export default async function ProjectClientsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  
  const [overview, clients] = await Promise.all([
    getProjectOverview(projectId),
    getProjectClients(projectId)
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
              <p className="text-gray-500 mt-1">Unique clients associated with this project: {clients.length}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ProjectNav projectId={projectId} />

        {/* Clients Grid */}
        <div className="mt-6">
          {clients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client: any) => (
                <div key={client.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{client.name}</h3>
                        <p className="text-xs text-gray-500">{client.client_code || 'No Code'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {(client.residential_city || client.residential_state) && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{[client.residential_city, client.residential_state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {(() => {
                      const deal = client._dealTotal || 0;
                      const paid = client._paidTotal || 0;
                      const balance = deal - paid;
                      const progress = deal > 0 ? Math.min(100, (paid / deal) * 100) : 0;
                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between items-end text-sm">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Plot Price</p>
                              <p className="font-semibold text-gray-900">₹{formatNumber(deal)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Amount Paid</p>
                              <p className="font-semibold text-emerald-600">₹{formatNumber(paid)}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-orange-600">Due: ₹{formatNumber(Math.max(0, balance))}</span>
                              <span className="text-gray-500">{formatNumber(progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                    <Link
                      href={`/clients/${client.id}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors inline-block w-full"
                    >
                      View Full Profile &rarr;
                    </Link>
                  </div>
                </div>
              ))}
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
