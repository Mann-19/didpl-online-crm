'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Search, Filter, Plus, Users, Download
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import BackLink from '@/components/ui/BackLink';

export default function EmployeeListClient({ initialEmployees }: { initialEmployees: any[] }) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ role: '', designation: '' });
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const uniqueRoles = [...new Set(employees.map(e => e.role).filter(Boolean))].sort();
  const uniqueDesignations = [...new Set(employees.map(e => e.designation).filter(Boolean))].sort();

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(term) ||
      (emp.employee_code || '').toLowerCase().includes(term) ||
      (emp.username || '').toLowerCase().includes(term) ||
      (emp.role || '').toLowerCase().includes(term);

    const matchesRole = !filters.role || emp.role === filters.role;
    const matchesDesignation = !filters.designation || emp.designation === filters.designation;

    return matchesSearch && matchesRole && matchesDesignation;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'role':
        return (a.role || '').localeCompare(b.role || '');
      case 'code':
        return (a.employee_code || '').localeCompare(b.employee_code || '');
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const displayedEmployees = sortedEmployees.slice(startIdx, startIdx + itemsPerPage);

  const theme = {
    button: 'bg-teal-600 hover:bg-teal-700 text-white',
    iconBg: 'bg-teal-100 text-teal-700',
    rowHover: 'hover:bg-teal-50',
    focusRing: 'focus:border-teal-500 focus:ring-teal-500',
    paginationActive: 'bg-teal-600 text-white border-teal-600'
  };

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 font-sans animate-in fade-in duration-300">
      <BackLink href="/employees" dirname="Team Members" accent="teal" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-md ${theme.iconBg}`}>
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Members</h1>
          </div>
          <p className="text-sm text-gray-500 ml-1">
            Manage credentials and access for {employees.length} active team members.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full text-gray-500 focus-within:text-teal-600">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, code, username..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:bg-white transition-all ${theme.focusRing}`}
            />
          </div>

          <div className="relative w-full md:w-48 text-gray-500 focus-within:text-teal-600">
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
              <option value="role">Sort: Role</option>
              <option value="code">Sort: Code</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-gray-100">
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className={`flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 ${theme.focusRing}`}
          >
            <option value="">All Roles</option>
            {uniqueRoles.map(role => <option key={role as string} value={role as string}>{role as string}</option>)}
          </select>
          <select
            value={filters.designation}
            onChange={(e) => handleFilterChange('designation', e.target.value)}
            className={`flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-1 ${theme.focusRing}`}
          >
            <option value="">All Designations</option>
            {uniqueDesignations.map(des => <option key={des as string} value={des as string}>{des as string}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        {displayedEmployees.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max" style={{ minWidth: '900px' }}>
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 w-24">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Designation</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Contractual Payment</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEmployees.map((emp, idx) => (
                    <tr key={emp.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${theme.rowHover} transition-colors`}>
                      <td className="px-6 py-4 text-sm font-medium text-teal-600 whitespace-nowrap">{emp.employee_code || '---'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{emp.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{emp.designation || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-mono whitespace-nowrap">
                        {emp.salary ? `₹${parseFloat(emp.salary).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-600 whitespace-nowrap">{emp.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap"><Badge variant="info">{emp.role}</Badge></td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-100"
                          title="Generate Welcome Letter"
                          onClick={() => alert("Welcome letter generation porting in progress")}
                        >
                          <Download className="w-3.5 h-3.5" /> Contractual Letter
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, sortedEmployees.length)} of {sortedEmployees.length} members
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
            <p className="text-gray-600 text-lg font-medium mb-1">No team members found</p>
          </div>
        )}
      </div>
    </div>
  );
}
