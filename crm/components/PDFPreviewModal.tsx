'use client';

import { useMemo, useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: any; // jsPDF instance
  fileName: string;
  title?: string;
}

export default function PDFPreviewModal({ isOpen, onClose, pdfDoc, fileName, title = 'Receipt Preview' }: PDFPreviewModalProps) {
  const pdfUrl = useMemo(() => {
    if (!isOpen || !pdfDoc) return null;
    try {
      const pdfBlob = pdfDoc.output('blob');
      return URL.createObjectURL(pdfBlob);
    } catch (e) {
      console.error("Failed to generate PDF blob", e);
      return null;
    }
  }, [isOpen, pdfDoc]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-gray-100/50">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Preview" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                <span className="text-sm">Generating Preview...</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
          <button
            onClick={() => {
              if (pdfDoc && fileName) {
                pdfDoc.save(fileName);
                onClose();
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
