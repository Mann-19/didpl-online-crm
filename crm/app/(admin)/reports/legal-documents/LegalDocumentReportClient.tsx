'use client';

import { useState, useMemo } from 'react';
import { Search, Map, Upload, ChevronDown, ChevronRight, FileText, User } from 'lucide-react';
import BackLink from '@/components/ui/BackLink';
import UploadModal from '@/components/documents/UploadModal';
import DocumentCard from '@/components/documents/DocumentCard';
import { useRouter } from 'next/navigation';

export default function LegalDocumentReportClient({ initialData }: { initialData: any[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // For accordion state
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // For upload modal state
  const [uploadModal, setUploadModal] = useState<{ clientId: string; bookingId: string } | null>(null);

  // Extract unique project names for the filter dropdown
  const allProjects = useMemo(() => {
    const projects = new Set<string>();
    initialData.forEach(client => {
      client.bookings.forEach((b: any) => {
        if (b.project_name && b.project_name !== '?') projects.add(b.project_name);
      });
    });
    return Array.from(projects).sort();
  }, [initialData]);

  // Filter the data based on search and project
  const filteredData = useMemo(() => {
    return initialData.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.client_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm);

      const matchesProject = !projectFilter || client.bookings.some((b: any) => b.project_name === projectFilter);

      return matchesSearch && matchesProject;
    });
  }, [initialData, searchTerm, projectFilter]);

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const handleUploadComplete = () => {
    // Refresh the server component to get the new documents
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <BackLink href="/reports" />
          <div className="flex items-center gap-3 mt-4">
            <div className="p-2 rounded-md bg-indigo-100 text-indigo-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Legal Document Report</h1>
              <p className="text-sm text-gray-500 mt-1">Client-wise uploaded documents and bookings overview.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client name, code, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="relative sm:w-64">
          <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Projects</option>
            {allProjects.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredData.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No clients found matching the filters.</p>
          </div>
        ) : (
          filteredData.map(client => {
            const isExpanded = expandedClients.has(client.id);
            const totalDocs = client.bookings.reduce((sum: number, b: any) => sum + b.documents.length, 0);

            return (
              <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Accordion Header */}
                <button
                  onClick={() => toggleClient(client.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-1.5 rounded-md ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{client.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{client.client_code} • {client.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
                      {client.bookings.length} {client.bookings.length === 1 ? 'Booking' : 'Bookings'}
                    </span>
                    <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100">
                      {totalDocs} {totalDocs === 1 ? 'Document' : 'Documents'}
                    </span>
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-6 space-y-6">
                    {client.bookings.map((booking: any) => (
                      <div key={booking.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Booking Header */}
                        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50/80">
                          <div>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                              {booking.project_name} — Plot {booking.plot_number}
                              <span className="text-xs px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 uppercase tracking-wide font-bold">
                                {booking.status}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Booking Ref: {booking.booking_code}</p>
                          </div>
                          <button
                            onClick={() => setUploadModal({ clientId: client.id, bookingId: booking.id })}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Document
                          </button>
                        </div>

                        {/* Booking Documents */}
                        <div>
                          {booking.documents.length === 0 ? (
                            <div className="px-5 py-8 text-center">
                              <p className="text-sm text-gray-500">No documents uploaded for this booking yet.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-50">
                              {booking.documents.map((doc: any) => (
                                <DocumentCard
                                  key={doc.id}
                                  document={doc}
                                  onDeleted={handleUploadComplete}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {uploadModal && (
        <UploadModal
          clientId={uploadModal.clientId}
          bookingId={uploadModal.bookingId}
          onClose={() => setUploadModal(null)}
          onUploadComplete={handleUploadComplete}
          mode="legal"
        />
      )}
    </div>
  );
}
