'use client';
// components/documents/UploadModal.tsx
// Drag-and-drop upload modal with file type selector, progress bar, and validation

import { useRef, useState, useCallback } from 'react';
import { X, UploadCloud, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateFile, formatBytes, ALLOWED_EXTENSIONS } from '@/utils/documents/validation';

const DOCUMENT_TYPES = [
  { value: 'kyc',            label: 'KYC Document' },
  { value: 'aadhaar_pan',    label: 'Aadhaar / PAN' },
  { value: 'property',       label: 'Property Document' },
  { value: 'sale_agreement', label: 'Sale Agreement' },
  { value: 'rent_agreement', label: 'Rent Agreement' },
  { value: 'image',          label: 'Image / Photo' },
  { value: 'miscellaneous',  label: 'Miscellaneous' },
];

interface Props {
  clientId: string;
  bookingId: string;
  onClose:  () => void;
  onUploadComplete: () => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export default function UploadModal({ clientId, bookingId, onClose, onUploadComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging,    setDragging]    = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType,    setDocType]     = useState('miscellaneous');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress,    setProgress]   = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setValidationError(null);
    const result = validateFile(file);
    if (!result.valid) {
      setValidationError(result.error ?? 'Invalid file');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadState('uploading');
    setProgress(15);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file',          selectedFile);
      formData.append('client_id',     clientId);
      formData.append('booking_id',    bookingId);
      formData.append('document_type', docType);
      if (description.trim()) formData.append('description', description.trim());

      setProgress(40);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body:   formData,
        credentials: 'include',
      });

      setProgress(85);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Upload failed');
      }

      setProgress(100);
      setUploadState('success');

      // Brief success state, then close and refresh
      setTimeout(() => {
        onUploadComplete();
        onClose();
      }, 900);

    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(err.message ?? 'Upload failed. Please try again.');
      setProgress(0);
    }
  };

  const isUploading = uploadState === 'uploading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Upload Document</h3>
            <p className="text-xs text-gray-400 mt-0.5">PDF, Images, Word, Excel, ZIP · Max 50 MB</p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 disabled:opacity-50"
            aria-label="Close upload modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragging(false)}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}
              ${isUploading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={ALLOWED_EXTENSIONS}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-blue-50 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(selectedFile.size)}</p>
                {!isUploading && (
                  <p className="text-xs text-blue-500 mt-1">Click to change file</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-gray-100 rounded-full">
                  <UploadCloud className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm">Drop file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">PDF · JPG · PNG · DOCX · XLSX · ZIP</p>
                </div>
              </div>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{validationError}</p>
            </div>
          )}

          {/* Document type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              disabled={isUploading}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isUploading}
              placeholder="e.g. Sale Agreement — Phase 1, Aadhaar front side"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
              maxLength={200}
            />
          </div>

          {/* Progress bar */}
          {uploadState === 'uploading' && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success state */}
          {uploadState === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">Document uploaded successfully!</p>
            </div>
          )}

          {/* Upload error */}
          {uploadState === 'error' && errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || uploadState === 'success'}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
