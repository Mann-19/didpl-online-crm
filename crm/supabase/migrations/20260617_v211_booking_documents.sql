-- Add booking_id to client_documents
ALTER TABLE public.client_documents
ADD COLUMN booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

-- Create index for faster filtering by booking
CREATE INDEX IF NOT EXISTS idx_client_documents_booking_id ON public.client_documents(booking_id);
