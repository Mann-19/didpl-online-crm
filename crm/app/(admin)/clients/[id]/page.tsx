import { getClientById } from '../../people.actions';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import ClientDetailClient from './ClientDetailClient';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const role = profile?.role ?? 'employee';
  const isAdmin = role === 'admin' || role === 'master_admin';

  const client = await getClientById(id);
  if (!client) notFound();

  return <ClientDetailClient client={client} isAdmin={isAdmin} role={role} />;
}