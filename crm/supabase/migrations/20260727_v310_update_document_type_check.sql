-- =============================================================
-- v310: Update document_type CHECK constraint on client_documents
-- Allows sale_agreement, rent_agreement, and image in addition to
-- kyc, aadhaar_pan, property, miscellaneous.
-- =============================================================

ALTER TABLE public.client_documents
  DROP CONSTRAINT IF EXISTS client_documents_document_type_check;

ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_document_type_check
  CHECK (document_type IN (
    'kyc',
    'aadhaar_pan',
    'property',
    'sale_agreement',
    'rent_agreement',
    'image',
    'miscellaneous'
  ));
