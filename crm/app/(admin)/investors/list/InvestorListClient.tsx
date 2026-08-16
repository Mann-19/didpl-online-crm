'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Search, Filter, Plus, Users, Phone, ArrowUpRight
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import BackLink from '@/components/ui/BackLink';

export default function InvestorListClient({ initialInvestors }: { initialInvestors: any[] }) {
  const [investors, setInvestors] = useState(initialInvestors);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [activeFilter, setActiveFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredInvestors = investors.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (inv.name || '').toLowerCase().includes(term) ||
      (inv.phone || '').toLowerCase().includes(term) ||
      (inv.investor_code || '').toLowerCase().includes(term);

    const matchesActive = activeFilter === '' ||
      (activeFilter === 'active' && inv.active_investments_count > 0) ||
      (activeFilter === 'inactive' && inv.active_investments_count === 0);

    return matchesSearch && matchesActive;
  });

  const sortedInvestors = [...filteredInvestors].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'code':
        return (a.investor_code || '').localeCompare(b.investor_code || '');
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedInvestors.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const displayedInvestors = sortedInvestors.slice(startIdx, startIdx + itemsPerPage);

  const formatLakhs = (amount: number) => {
    if (!amount) return '₹0.00 L';
    return `₹${(amount / 100000).toFixed(2)} L`;
  };

  const theme = {
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    iconBg: 'bg-indigo-100 text-indigo-700',
    rowHover: 'hover:bg-indigo-50',
    linkText: 'text-indigo-600 hover:text-indigo-800',
    focusRing: 'focus:border-indigo-500 focus:ring-indigo-500',
    paginationActive: 'bg-indigo-600 text-white border-indigo-600'
  };

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 font-sans animate-in fade-in duration-300">
      <BackLink href="/investors" dirname="Investors" accent="indigo" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-md ${theme.iconBg}`}>
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Investor Directory</h1>
          </div>
          <p className="text-sm text-gray-500 ml-1 mt-3">
            Total {investors.length} registered investors.
          </p>
        </div>

        <Link
          href="/investors/new"
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors ${theme.button}`}
        >
          <Plus className="w-4 h-4" /> Add Investor
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full text-gray-500 focus-within:text-indigo-600">
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

          <div className="relative w-full md:w-48 text-gray-500 focus-within:text-indigo-600">
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
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 ${theme.focusRing}`}
          >
            <option value="">All Investors</option>
            <option value="active">Active Investments</option>
            <option value="inactive">No Active Investments</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        {displayedInvestors.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Contact</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Total Invested</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Pending Returns</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Active</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">View</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedInvestors.map((inv, idx) => (
                    <tr key={inv.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${theme.rowHover} transition-colors`}>
                      <td className="px-6 py-4 text-sm font-medium text-indigo-600 whitespace-nowrap">{inv.investor_code || '---'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{inv.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" />{inv.phone || '---'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700 whitespace-nowrap">
                        {formatLakhs(inv.total_invested)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-emerald-600 whitespace-nowrap">
                        {formatLakhs(inv.pending_returns)}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <Badge variant={inv.active_investments_count > 0 ? "warning" : "indigo"}>
                          {inv.active_investments_count} Active
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <Link href={`/investors/${inv.id}`} className={`inline-flex items-center gap-1 font-medium ${theme.linkText}`}>
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
                  Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, sortedInvestors.length)} of {sortedInvestors.length} investors
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
            <p className="text-gray-600 text-lg font-medium mb-1">No investors found</p>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Get started by adjusting filters or adding a new investor.</p>
          </div>
        )}
      </div>
    </div>
  );
}
