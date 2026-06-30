import { getPlotDetails } from '@/app/(admin)/plots.actions';
import { getClients, getConsultants } from '@/app/(admin)/people.actions';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import PlotDetailsClient from './PlotDetailsClient';

export default async function PlotDetailsPage({ params }: { params: Promise<{ id: string, plotId: string }> }) {
  const resolvedParams = await params;
  const plotId = resolvedParams.plotId;
  const projectId = resolvedParams.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const role = profile?.role ?? 'employee';
  const isAdmin = role === 'admin' || role === 'master_admin';

  const [plot, clients, consultants] = await Promise.all([
    getPlotDetails(plotId, projectId),
    getClients(),
    getConsultants()
  ]);

  if (!plot) {
    notFound();
  }

  return (
    <PlotDetailsClient
      initialPlot={plot}
      clients={clients}
      consultants={consultants}
      projectId={projectId}
      isAdmin={isAdmin}
      role={role}
      basePath="/didllp/projects"
    />
  );
}
