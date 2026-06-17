'use client';
// components/documents/DocumentCard.tsx
// Single document row with download + soft-delete actions

import { useState } from 'react';
import {
  FileText, Image, FileSpreadsheet, FileArchive,
  Download, Trash2, AlertCircle, Loader2
} from 'lucide-react';
import { formatBytes } from '@/utils/documents/validation';

export interface ClientDocument {
  id:            string;
  file_name:     string;
  file_size:     number;
  mime_type:     string;
  document_type: string;
  description:   string | null;
  uploaded_at:   string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  kyc:            'KYC',
  aadhaar_pan:    'Aadhaar / PAN',
  property:       'Property',
  sale_agreement: 'Sale Agreement',
  rent_agreement: 'Rent Agreement',
  image:          'Image',
  miscellaneous:  'Misc',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  kyc:            'bg-purple-100 text-purple-700',
  aadhaar_pan:    'bg-amber-100 text-amber-700',
  property:       'bg-blue-100 text-blue-700',
  sale_agreement: 'bg-emerald-100 text-emerald-700',
  rent_agreement: 'bg-teal-100 text-teal-700',
  image:          'bg-pink-100 text-pink-700',
  miscellaneous:  'bg-gray-100 text-gray-600',
};

function MimeIcon({ mimeType }: { mimeType: string }) {
  const cls = 'w-5 h-5';
  if (mimeType === 'application/pdf')    return <FileText    className={`${cls} text-red-500`} />;
  if (mimeType.startsWith('image/'))     return <Image       className={`${cls} text-blue-500`} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
                                         return <FileSpreadsheet className={`${cls} text-emerald-600`} />;
  if (mimeType === 'application/zip')    return <FileArchive  className={`${cls} text-yellow-600`} />;
  return                                        <FileText    className={`${cls} text-gray-400`} />;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

interface Props {
  document:  ClientDocument;
  onDeleted: () => void;
}

export default function DocumentCard({ document: doc, onDeleted }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Download failed');

      // Trigger download via hidden anchor
      const a = Object.assign(document.createElement('a'), {
        href:     data.signedUrl,
        download: data.fileName,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message ?? 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${doc.file_name}"?\n\nThe document will be hidden but can be recovered by an admin.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/delete`, {
        method:      'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      onDeleted();
    } catch (err: any) {
      setError(err.message ?? 'Delete failed');
      setDeleting(false);
    }
  };

  const typeBadge = DOC_TYPE_COLORS[doc.document_type] ?? 'bg-gray-100 text-gray-600';
  const typeLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type;

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
      {/* Icon */}
      <div className="p-2 rounded-lg bg-gray-100 shrink-0">
        <MimeIcon mimeType={doc.mime_type} />
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate" title={doc.file_name}>
            {doc.file_name}
          </p>
          <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${typeBadge}`}>
            {typeLabel}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatBytes(doc.file_size)} · {formatDate(doc.uploaded_at)}
          {doc.description && <span className="ml-2 text-gray-500">— {doc.description}</span>}
        </p>
        {error && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          disabled={downloading || deleting}
          title="Download"
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
        >
          {downloading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />}
        </button>
        <button
          onClick={handleDelete}
          disabled={downloading || deleting}
          title="Delete"
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
        >
          {deleting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Trash2  className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
