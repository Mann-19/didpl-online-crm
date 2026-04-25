'use client';

import { useMemo, useEffect } from 'react';
import { X, Download, Printer } from 'lucide-react';
import type jsPDF from 'jspdf';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDoc: jsPDF | null;
  fileName: string;
  title?: string;
}

export default function PDFPreviewModal({ isOpen, onClose, pdfDoc, fileName, title = 'PDF Preview' }: PDFPreviewModalProps) {
  const pdfUrl = useMemo(() => {
    if (!isOpen || !pdfDoc) return null;
    
    // We get a Blob URL from the jsPDF instance so we can load it in an iframe
    const pdfBlob = pdfDoc.output('blob');
    return URL.createObjectURL(pdfBlob);
  }, [isOpen, pdfDoc]);

  useEffect(() => {
    // Cleanup blob URL when component unmounts or pdfUrl changes
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleDownload = () => {
    if (pdfDoc && fileName) {
      pdfDoc.save(fileName);
      onClose();
    }
  };

  const handlePrint = () => {
     if (pdfUrl) {
       // Open the PDF in a new tab to let the browser handle printing seamlessly
       window.open(pdfUrl, '_blank');
     }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 overflow-hidden bg-gray-100/50">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-gray-500 font-medium">Generating document...</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
