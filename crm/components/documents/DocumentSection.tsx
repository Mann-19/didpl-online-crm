'use client';
// components/documents/DocumentSection.tsx
// Main document section: list, search, filter, pagination, upload button

import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, Upload, Search, SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import DocumentCard, { type ClientDocument } from './DocumentCard';
import UploadModal from './UploadModal';

const DOCUMENT_TYPES = [
  { value: '',               label: 'All Types' },
  { value: 'kyc',            label: 'KYC Documents' },
  { value: 'aadhaar_pan',    label: 'Aadhaar / PAN' },
  { value: 'property',       label: 'Property Documents' },
  { value: 'sale_agreement', label: 'Sale Agreement' },
  { value: 'rent_agreement', label: 'Rent Agreement' },
  { value: 'image',          label: 'Images' },
  { value: 'miscellaneous',  label: 'Miscellaneous' },
];

const PAGE_SIZE = 20;

interface Pagination {
  page:    number;
  limit:   number;
  total:   number;
  hasMore: boolean;
}

interface Props {
  clientId: string;
  bookingId?: string;
  showUploadButton?: boolean;
}

export default function DocumentSection({ clientId, bookingId, showUploadButton = true }: Props) {
  const [documents,    setDocuments]    = useState<ClientDocument[]>([]);
  const [pagination,   setPagination]   = useState<Pagination>({ page: 1, limit: PAGE_SIZE, total: 0, hasMore: false });
  const [loading,      setLoading]      = useState(true);
  const [searchInput,  setSearchInput]  = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [page,         setPage]         = useState(1);
  const [showUpload,   setShowUpload]   = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchInput]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        client_id: clientId,
        page:      String(page),
        limit:     String(PAGE_SIZE),
      });
      if (bookingId) params.append('booking_id', bookingId);
      if (searchQuery) params.set('search', searchQuery);
      if (filterType)  params.set('type',   filterType);

      const res = await fetch(`/api/documents?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(data.documents ?? []);
      setPagination(data.pagination);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, bookingId, page, searchQuery, filterType]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDocDeleted = () => {
    // If this was the last item on the page, go to previous page
    if (documents.length === 1 && page > 1) {
      setPage(p => p - 1);
    } else {
      fetchDocuments();
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-500" />
            <h2 className="font-bold text-gray-900">Documents</h2>
            <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
              {pagination.total} {pagination.total === 1 ? 'file' : 'files'}
            </span>
          </div>
          {showUploadButton && (
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          )}
        </div>

        {/* Search + Filter toolbar */}
        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by filename…"
              className="w-full pl-8 pr-7 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
              className="text-sm border border-gray-300 rounded-lg py-2 pl-2 pr-8 bg-white focus:ring-2 focus:ring-blue-500"
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 bg-gray-100 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/5" />
                </div>
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState hasFilters={!!searchQuery || !!filterType} onClear={() => { clearSearch(); setFilterType(''); }} />
        ) : (
          <div className="divide-y divide-gray-50" role="list" aria-label="Document list">
            {documents.map(doc => (
              <div key={doc.id} role="listitem">
                <DocumentCard document={doc} onDeleted={handleDocDeleted} />
              </div>
            ))}
          </div>
        )}

        {/* Pagination footer */}
        {pagination.total > PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-gray-600 px-2">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasMore}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          clientId={clientId}
          bookingId={bookingId || ''}
          onClose={() => setShowUpload(false)}
          onUploadComplete={() => { setPage(1); fetchDocuments(); }}
        />
      )}
    </>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
      <div className="p-4 bg-gray-100 rounded-full">
        <FolderOpen className="w-8 h-8 text-gray-300" />
      </div>
      {hasFilters ? (
        <>
          <p className="font-semibold text-gray-600">No documents match your filters</p>
          <button
            onClick={onClear}
            className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
          >
            Clear filters
          </button>
        </>
      ) : (
        <>
          <p className="font-semibold text-gray-600">No documents uploaded yet</p>
          <p className="text-sm text-gray-400 max-w-xs">
            Upload KYC documents, agreements, images, or any relevant files for this client.
          </p>
        </>
      )}
    </div>
  );
}
