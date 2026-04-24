'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatNumber } from '@/utils/formatNumber';
import { FolderKanban } from 'lucide-react';

export default function ProjectsListClient({ initialProjects }: { initialProjects: any[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const formatCurrency = (amount: number) => `₹${formatNumber(amount)}`;

  // Filter projects logic
  const filteredProjects = initialProjects.filter((project) => {
    const matchesSearch =
      (project.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const statusLower = (project.status || 'active').toLowerCase();
    const matchesStatus = filterStatus === 'all' || statusLower === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-md bg-blue-100 text-blue-700">
              <FolderKanban className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Projects</h1>
          </div>
          <p className="text-sm md:text-base text-gray-600 ml-1">
            Manage all your real estate projects and track performance
          </p>
        </div>
      </div>

      {/* Filters (Basic for now) */}
      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Search projects..." 
          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white w-full max-w-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select 
          className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Projects Cards Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const statusDisplay = (project.status || 'Active').charAt(0).toUpperCase() + (project.status || 'active').slice(1);
            // Default color for project top bar
            const projectColor = 'bg-blue-500';

            return (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden h-full group flex flex-col"
              >
                {/* Header Bar */}
                <div className={`${projectColor} h-2`}></div>

                {/* Content */}
                <div className="p-4 md:p-6 space-y-4 md:space-y-5 flex-1 flex flex-col">
                  {/* Title Section */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors"
                      >
                        {project.name}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        📍 {project.location || 'Location not specified'}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${statusDisplay === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {statusDisplay}
                    </span>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-3 gap-2 pb-4 border-b border-gray-200">
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-bold text-gray-900">
                        {project.totalPlots}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-600">Total Plots</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-bold text-blue-600">
                        {project.soldPlots}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-600">Sold</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-bold text-orange-600">
                        {project.availablePlots}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-600">Available</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-3 text-sm flex-1">
                    {/* Financial Section */}
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-600">Project Value</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(project.totalRevenue)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center px-2">
                      <span className="text-gray-600">Collected</span>
                      <div className="text-right">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(project.amountReceived)}
                        </span>
                        <span className="text-xs text-green-600 ml-1">
                          ({formatNumber(project.collectionRate)}%)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center px-2">
                      <span className="text-gray-600">Pending</span>
                      <div className="text-right">
                        <span className="font-semibold text-red-600">
                          {formatCurrency(project.pendingAmount)}
                        </span>
                        <span className="text-xs text-red-600 ml-1">
                          ({formatNumber(project.pendingPercentage)}%)
                        </span>
                      </div>
                    </div>

                    {/* Amount Progress Bar */}
                    <div className="px-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(project.collectionRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 my-2"></div>
                    <div className="flex justify-between px-2">
                      <span className="text-gray-600">Total Area</span>
                      <span className="text-gray-900">{project.totalAreaSqYd > 0 ? `${formatNumber(project.totalAreaSqYd)} sq.yd` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between px-2">
                      <span className="text-gray-600">Total Clients</span>
                      <span className="text-gray-900">{project.clientCount}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 md:gap-3 pt-3 md:pt-4 mt-auto">
                    <Link
                      href={`/projects/${project.id}`}
                      className="w-full flex items-center justify-center text-center bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs px-1 py-2 rounded-lg transition-colors font-medium border border-blue-200"
                    >
                      Overview
                    </Link>
                    <Link
                      href={`/projects/${project.id}/layout`}
                      className="w-full flex items-center justify-center text-center bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs px-1 py-2 rounded-lg transition-colors font-medium border border-purple-200"
                    >
                      Layout
                    </Link>
                    <Link
                      href={`/projects/${project.id}/list`}
                      className="w-full flex items-center justify-center text-center bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs px-1 py-2 rounded-lg transition-colors font-medium border border-gray-200"
                    >
                      List
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-4 text-5xl">📂</div>
          <h3 className="text-lg font-medium text-gray-900">
            No projects found
          </h3>
          <p className="text-gray-500 mt-1">Try adjusting your search terms or add a new project.</p>
        </div>
      )}
    </div>
  );
}
