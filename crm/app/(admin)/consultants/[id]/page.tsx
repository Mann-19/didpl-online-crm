import { getConsultantById } from '../../people.actions';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ConsultantDetailClient from './ConsultantDetailClient';

export default async function ConsultantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  const isAdmin = profile?.role === 'admin';

  const consultant = await getConsultantById(id);
  if (!consultant) notFound();

  return <ConsultantDetailClient consultant={consultant} isAdmin={isAdmin} />;
}
