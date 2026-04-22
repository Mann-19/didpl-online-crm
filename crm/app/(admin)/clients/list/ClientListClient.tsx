'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Search, Filter, Plus, User, Phone, ArrowUpRight, Users
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import BackLink from '@/components/ui/BackLink';

export default function ClientListClient({ initialClients }: { initialClients: any[] }) {
  const [clients, setClients] = useState(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ project: '', consultant: '' });
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Logic
  const uniqueProjects = [...new Set(clients.map(c => c.project_name).filter(Boolean))].sort();
  const uniqueConsultants = [...new Set(clients.map(c => c.consultant_name).filter(Boolean))].sort();

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredClients = clients.filter((client) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (client.name || '').toLowerCase().includes(term) ||
      (client.phone || '').toLowerCase().includes(term) ||
      (client.client_code || '').toLowerCase().includes(term) ||
      (client.email || '').toLowerCase().includes(term);

    const matchesProject = !filters.project || client.project_name === filters.project;
    const matchesConsultant = !filters.consultant || client.consultant_name === filters.consultant;

    return matchesSearch && matchesProject && matchesConsultant;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'code':
        return (a.client_code || '').localeCompare(b.client_code || '');
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedClients.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const displayedClients = sortedClients.slice(startIdx, startIdx + itemsPerPage);

  const theme = {
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    iconBg: 'bg-blue-100 text-blue-700',
    rowHover: 'hover:bg-blue-50',
    linkText: 'text-blue-600 hover:text-blue-800',
    focusRing: 'focus:border-blue-500 focus:ring-blue-500',
    paginationActive: 'bg-blue-600 text-white border-blue-600'
  };

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 font-sans animate-in fade-in duration-300">
      <BackLink href="/clients" dirname="Clients" accent="blue" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-md ${theme.iconBg}`}>
              <User className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Existing Clients</h1>
          </div>
          <p className="text-sm text-gray-500 ml-1 mt-3">
            Manage your customer base of {clients.length} active clients.
          </p>
        </div>

        <Link
          href="/clients/new"
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors ${theme.button}`}
        >
          <Plus className="w-4 h-4" /> Add Client
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full text-gray-500 focus-within:text-blue-600">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, code, phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:bg-white transition-all ${theme.focusRing}`}
            />
          </div>

          <div className="relative w-full md:w-48 text-gray-500 focus-within:text-blue-600">
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

        <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-gray-100">
          <select
            value={filters.project}
            onChange={(e) => handleFilterChange('project', e.target.value)}
            className={`flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 ${theme.focusRing}`}
          >
            <option value="">All Projects</option>
            {uniqueProjects.map(proj => <option key={proj as string} value={proj as string}>{proj as string}</option>)}
          </select>
          <select
            value={filters.consultant}
            onChange={(e) => handleFilterChange('consultant', e.target.value)}
            className={`flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 ${theme.focusRing}`}
          >
            <option value="">All Consultants</option>
            {uniqueConsultants.map(cons => <option key={cons as string} value={cons as string}>{cons as string}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        {displayedClients.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Project</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Contact</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Consultant</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">View</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedClients.map((client, idx) => (
                    <tr key={client.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${theme.rowHover} transition-colors`}>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600 whitespace-nowrap">{client.client_code || '---'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600 whitespace-nowrap">
                        {client.project_name ? <Badge variant="purple">{client.project_name}</Badge> : <span className="text-gray-400 italic">--</span>}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{client.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" />{client.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {client.consultant_name ? (
                          <div className="font-medium text-amber-600">
                            {client.consultant_name}
                          </div>
                        ) : <span className="text-gray-400 text-xs italic">Direct Client</span>}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap"><Badge variant="success">Active</Badge></td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <Link href={`/clients/${client.id}`} className={`inline-flex items-center gap-1 font-medium ${theme.linkText}`}>
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
                  Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, sortedClients.length)} of {sortedClients.length} clients
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
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 text-lg font-medium mb-1">No clients found</p>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Get started by adding your first client.</p>
          </div>
        )}
      </div>
    </div>
  );
}
