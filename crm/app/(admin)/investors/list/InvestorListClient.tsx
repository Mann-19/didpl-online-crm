'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Search, Filter, Plus, Users, Phone, ArrowUpRight, TrendingUp, Edit2, CheckCircle2, Clock
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import BackLink from '@/components/ui/BackLink';
import EditInvestorModal from '../components/EditInvestorModal';
import EditInvestmentModal from '../components/EditInvestmentModal';
import { settleInvestment } from '../../investors.actions';

export default function InvestorListClient({
  initialInvestors,
  referrers = [],
  initialInvestments = [],
}: {
  initialInvestors: any[];
  referrers?: any[];
  initialInvestments?: any[];
}) {
  const [activeTab, setActiveTab] = useState<'investors' | 'investments'>('investors');
  const [investors, setInvestors] = useState(initialInvestors);
  const [investments, setInvestments] = useState(initialInvestments);

  // Modal states
  const [editingInvestor, setEditingInvestor] = useState<any | null>(null);
  const [editingInvestment, setEditingInvestment] = useState<any | null>(null);

  // Filters for Investors
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [activeFilter, setActiveFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filters for Investments
  const [investmentSearchTerm, setInvestmentSearchTerm] = useState('');
  const [investmentStatusFilter, setInvestmentStatusFilter] = useState('');
  const [investmentSortBy, setInvestmentSortBy] = useState('newest');
  const [investmentPage, setInvestmentPage] = useState(1);

  // Filtered Investors
  const filteredInvestors = investors.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (inv.name || '').toLowerCase().includes(term) ||
      (inv.phone || '').toLowerCase().includes(term) ||
      (inv.investor_code || '').toLowerCase().includes(term);

    const matchesActive =
      activeFilter === '' ||
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
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedInvestors.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const displayedInvestors = sortedInvestors.slice(startIdx, startIdx + itemsPerPage);

  // Filtered Investments
  const filteredInvestments = investments.filter((inv) => {
    const term = investmentSearchTerm.toLowerCase();
    const matchesSearch =
      (inv.investment_code || '').toLowerCase().includes(term) ||
      (inv.investor?.name || '').toLowerCase().includes(term) ||
      (inv.investor?.investor_code || '').toLowerCase().includes(term) ||
      (inv.transaction_id || '').toLowerCase().includes(term);

    const matchesStatus =
      investmentStatusFilter === '' || inv.status === investmentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedInvestments = [...filteredInvestments].sort((a, b) => {
    switch (investmentSortBy) {
      case 'newest':
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case 'mature_date':
        return new Date(a.mature_date || 0).getTime() - new Date(b.mature_date || 0).getTime();
      case 'amount_desc':
        return (Number(b.invested_amount) || 0) - (Number(a.invested_amount) || 0);
      case 'amount_asc':
        return (Number(a.invested_amount) || 0) - (Number(b.invested_amount) || 0);
      default:
        return 0;
    }
  });

  const totalInvestmentPages = Math.ceil(sortedInvestments.length / itemsPerPage);
  const startInvestmentIdx = (investmentPage - 1) * itemsPerPage;
  const displayedInvestments = sortedInvestments.slice(
    startInvestmentIdx,
    startInvestmentIdx + itemsPerPage
  );

  const formatLakhs = (amount: number) => {
    if (!amount) return '₹0.00 L';
    return `₹${(amount / 100000).toFixed(2)} L`;
  };

  const handleInvestorUpdated = (updatedProfile: any) => {
    setInvestors(prev =>
      prev.map(inv => (inv.id === updatedProfile.id ? { ...inv, ...updatedProfile } : inv))
    );
    setInvestments(prev =>
      prev.map(item =>
        item.investor_id === updatedProfile.id
          ? {
              ...item,
              investor: {
                ...item.investor,
                name: updatedProfile.name,
                investor_code: updatedProfile.investor_code,
                phone: updatedProfile.phone,
              },
            }
          : item
      )
    );
  };

  const handleInvestmentUpdated = (updatedInv: any) => {
    setInvestments(prev =>
      prev.map(inv => (inv.id === updatedInv.id ? { ...inv, ...updatedInv } : inv))
    );

    // Also update stats in investors list
    setInvestors(prev =>
      prev.map(inv => {
        if (inv.id === updatedInv.investor_id) {
          const updatedInvestments = (inv.investments || []).map((i: any) =>
            i.id === updatedInv.id ? { ...i, ...updatedInv } : i
          );
          let totalInvested = 0;
          let pendingReturns = 0;
          let activeCount = 0;
          updatedInvestments.forEach((i: any) => {
            totalInvested += Number(i.invested_amount) || 0;
            if (i.status === 'pending') {
              pendingReturns += Number(i.mature_amount) || 0;
              activeCount++;
            }
          });
          return {
            ...inv,
            investments: updatedInvestments,
            total_invested: totalInvested,
            pending_returns: pendingReturns,
            active_investments_count: activeCount,
          };
        }
        return inv;
      })
    );
  };

  const handleInvestmentDeleted = (deletedId: string) => {
    setInvestments(prev => prev.filter(inv => inv.id !== deletedId));
    setInvestors(prev =>
      prev.map(inv => {
        const remaining = (inv.investments || []).filter((i: any) => i.id !== deletedId);
        let totalInvested = 0;
        let pendingReturns = 0;
        let activeCount = 0;
        remaining.forEach((i: any) => {
          totalInvested += Number(i.invested_amount) || 0;
          if (i.status === 'pending') {
            pendingReturns += Number(i.mature_amount) || 0;
            activeCount++;
          }
        });
        return {
          ...inv,
          investments: remaining,
          total_invested: totalInvested,
          pending_returns: pendingReturns,
          active_investments_count: activeCount,
        };
      })
    );
  };

  const handleSettle = async (investmentId: string, investorId: string) => {
    if (confirm('Are you sure you want to mark this investment as settled?')) {
      const res = await settleInvestment(investmentId, investorId);
      if (res.success && res.data) {
        handleInvestmentUpdated(res.data);
      }
    }
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
    <div className="min-h-screen bg-gray-50 space-y-6 font-sans animate-in fade-in duration-300 pb-12">
      <BackLink href="/investors" dirname="Investors" accent="indigo" />

      {/* Header and Add Investor Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-md ${theme.iconBg}`}>
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Investors & Investments Directory</h1>
          </div>
          <p className="text-sm text-gray-500 ml-1 mt-1">
            Browse, manage, and edit registered investors and their active or settled investments.
          </p>
        </div>

        <Link
          href="/investors/new"
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-colors ${theme.button}`}
        >
          <Plus className="w-4 h-4" /> Add Investor
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('investors')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'investors'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Investors Directory</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">
            {investors.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('investments')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'investments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Investments Directory</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">
            {investments.length}
          </span>
        </button>
      </div>

      {/* TAB 1: INVESTORS DIRECTORY */}
      {activeTab === 'investors' && (
        <>
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
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedInvestors.map((inv, idx) => (
                        <tr key={inv.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${theme.rowHover} transition-colors`}>
                          <td className="px-6 py-4 text-sm font-mono font-medium text-indigo-600 whitespace-nowrap">{inv.investor_code || '---'}</td>
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
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingInvestor(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
                                title="Edit Investor Profile"
                              >
                                <Edit2 className="w-3 h-3 text-indigo-600" />
                                <span>Edit</span>
                              </button>
                              <Link
                                href={`/investors/${inv.id}`}
                                className={`inline-flex items-center gap-1 font-medium text-xs ${theme.linkText}`}
                              >
                                View <ArrowUpRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
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
                      <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-4 py-2 border rounded bg-white text-sm disabled:opacity-50">Previous</button>
                      <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-4 py-2 border rounded bg-white text-sm disabled:opacity-50">Next</button>
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
        </>
      )}

      {/* TAB 2: INVESTMENTS DIRECTORY */}
      {activeTab === 'investments' && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full text-gray-500 focus-within:text-indigo-600">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by investment code, investor name, transaction ID..."
                  value={investmentSearchTerm}
                  onChange={(e) => {
                    setInvestmentSearchTerm(e.target.value);
                    setInvestmentPage(1);
                  }}
                  className={`w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:bg-white transition-all ${theme.focusRing}`}
                />
              </div>

              <div className="relative w-full md:w-48 text-gray-500 focus-within:text-indigo-600">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                <select
                  value={investmentSortBy}
                  onChange={(e) => {
                    setInvestmentSortBy(e.target.value);
                    setInvestmentPage(1);
                  }}
                  className={`w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-1 focus:bg-white cursor-pointer ${theme.focusRing}`}
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="mature_date">Sort: Maturity Date</option>
                  <option value="amount_desc">Amount: High to Low</option>
                  <option value="amount_asc">Amount: Low to High</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-gray-100">
              <select
                value={investmentStatusFilter}
                onChange={(e) => {
                  setInvestmentStatusFilter(e.target.value);
                  setInvestmentPage(1);
                }}
                className={`flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 ${theme.focusRing}`}
              >
                <option value="">All Investment Statuses</option>
                <option value="pending">Pending (Active)</option>
                <option value="settled">Settled (Paid Out)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            {displayedInvestments.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Inv. Code</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Investor</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Invested Amount</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rate</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Mature Amount</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Mature Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedInvestments.map((inv, idx) => (
                        <tr key={inv.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${theme.rowHover} transition-colors`}>
                          <td className="px-6 py-4 text-sm font-mono font-medium text-indigo-600 whitespace-nowrap">{inv.investment_code || '---'}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            <Link href={`/investors/${inv.investor_id}`} className="hover:text-indigo-600 transition-colors">
                              {inv.investor?.name || 'Investor'}
                              <span className="block text-xs font-mono text-gray-400">{inv.investor?.investor_code || ''}</span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {inv.investment_date ? new Date(inv.investment_date).toLocaleDateString() : '---'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                            ₹{Number(inv.invested_amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {inv.interest_rate}%
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-emerald-600 whitespace-nowrap">
                            ₹{Number(inv.mature_amount).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                            {new Date(inv.mature_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <Badge variant={inv.status === 'pending' ? 'warning' : 'success'}>
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingInvestment(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
                                title="Edit Investment"
                              >
                                <Edit2 className="w-3 h-3 text-indigo-600" />
                                <span>Edit</span>
                              </button>
                              {inv.status === 'pending' ? (
                                <button
                                  onClick={() => handleSettle(inv.id, inv.investor_id)}
                                  className="text-xs font-medium text-indigo-600 hover:text-indigo-900 hover:underline"
                                >
                                  Mark Settled
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  Settled
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalInvestmentPages > 1 && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Showing {startInvestmentIdx + 1} to {Math.min(startInvestmentIdx + itemsPerPage, sortedInvestments.length)} of {sortedInvestments.length} investments
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => setInvestmentPage(p => p - 1)} disabled={investmentPage === 1} className="px-4 py-2 border rounded bg-white text-sm disabled:opacity-50">Previous</button>
                      <button onClick={() => setInvestmentPage(p => p + 1)} disabled={investmentPage === totalInvestmentPages} className="px-4 py-2 border rounded bg-white text-sm disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 text-lg font-medium mb-1">No investments found</p>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Adjust search criteria or record new investments from an investor&apos;s details page.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Investor Profile Modal */}
      <EditInvestorModal
        isOpen={!!editingInvestor}
        onClose={() => setEditingInvestor(null)}
        investor={editingInvestor}
        referrers={referrers}
        onSuccess={handleInvestorUpdated}
      />

      {/* Edit Investment Modal */}
      <EditInvestmentModal
        isOpen={!!editingInvestment}
        onClose={() => setEditingInvestment(null)}
        investment={editingInvestment}
        onSuccess={handleInvestmentUpdated}
        onDelete={handleInvestmentDeleted}
      />
    </div>
  );
}
