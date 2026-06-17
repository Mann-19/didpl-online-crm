import { getBookingById } from '../../../../../../plots.actions';
import { getClients, getConsultants } from '../../../../../../people.actions';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import BookingDetailsClient from './BookingDetailsClient';

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string, plotId: string, bookingId: string }> }) {
  const resolvedParams = await params;
  const { id: projectId, plotId, bookingId } = resolvedParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const role = profile?.role ?? 'employee';
  const isAdmin = role === 'admin' || role === 'master_admin';

  const [booking, clients, consultants] = await Promise.all([
    getBookingById(bookingId),
    getClients(),
    getConsultants()
  ]);

  if (!booking) {
    notFound();
  }

  return (
    <BookingDetailsClient
      initialBooking={booking}
      clients={clients}
      consultants={consultants}
      projectId={projectId}
      plotId={plotId}
      isAdmin={isAdmin}
      role={role}
    />
  );
}
