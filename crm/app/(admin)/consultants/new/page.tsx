import { createClient } from '@/utils/supabase/server';
import NewConsultantPage from './NewConsultantPage';

export default async function NewConsultantServerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const role = profile?.role ?? 'employee';

  return <NewConsultantPage role={role} />;
}
