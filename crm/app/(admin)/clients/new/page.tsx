import { createClient } from '@/utils/supabase/server';
import NewClientPage from './NewClientPage';

export default async function NewClientServerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const role = profile?.role ?? 'employee';

  return <NewClientPage role={role} />;
}