'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Search, Filter, Plus, Briefcase, Phone, ArrowUpRight
} from 'lucide-react';
import BackLink from '@/components/ui/BackLink';

export default function ConsultantListClient({ initialConsultants }: { initialConsultants: any[] }) {
  const [consultants, setConsultants] = useState(initialConsultants);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredConsultants = consultants.filter((c) =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.consultant_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedConsultants = [...filteredConsultants].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'code':
        return (a.consultant_code || '').localeCompare(b.consultant_code || '');
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedConsultants.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const displayedConsultants = sortedConsultants.slice(startIdx, startIdx + itemsPerPage);

  const theme = {
    button: 'bg-amber-500 hover:bg-amber-600 text-white',
    iconBg: 'bg-amber-100 text-amber-700',
    rowHover: 'hover:bg-amber-50',
    linkText: 'text-amber-600 hover:text-amber-800',
    focusRing: 'focus:border-amber-500 focus:ring-amber-500',
    paginationActive: 'bg-amber-600 text-white border-amber-600'
  };

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 font-sans animate-in fade-in duration-300">
      <BackLink href="/consultants" dirname="Consultants" accent="amber" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-md ${theme.iconBg}`}>
              <Briefcase className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Existing Consultants</h1>
          </div>
          <p className="text-sm text-gray-500 ml-1">
            Manage your network of {consultants.length} active partners.
          </p>
        </div>

        <Link
          href="/consultants/new"
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors ${theme.button}`}
        >
          <Plus className="w-4 h-4" /> Register New
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full text-gray-500 focus-within:text-amber-600">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, code, or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:bg-white transition-all ${theme.focusRing}`}
            />
          </div>

          <div className="relative w-full md:w-48 text-gray-500 focus-within:text-amber-600">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-1 focus:bg-white cursor-pointer ${theme.focusRing}`}
            >
              <option value="name">Sort: Name (A-Z)</option>
              <option value="newest">Sort: Newest</option>
              <option value="code">Sort: Code</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        {displayedConsultants.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Consultant Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">PAN Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">View</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedConsultants.map((consultant, idx) => (
                    <tr key={consultant.id} className={`border-b border-gray-200 whitespace-nowrap ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${theme.rowHover} transition-colors`}>
                      <td className="px-6 py-4 text-sm font-medium text-amber-600">{consultant.consultant_code || '---'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{consultant.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" />{consultant.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{consultant.email || '---'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{consultant.pan_number || '---'}</td>
                      <td className="px-6 py-4 text-sm">
                        <Link href={`/consultants/${consultant.id}`} className={`inline-flex items-center gap-1 font-medium ${theme.linkText}`}>
                          View <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, sortedConsultants.length)} of {sortedConsultants.length} consultants
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-4 py-2 border rounded bg-white text-sm">Previous</button>
                  <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-4 py-2 border rounded bg-white text-sm">Next</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 text-lg font-medium mb-1">No consultants found</p>
          </div>
        )}
      </div>
    </div>
  );
}
