import { getProjectOverview, getProjectPlots } from '../../../projects.actions';
import { getFlexPlots } from '@/app/(admin)/flex-plots.actions';
import { getClients, getConsultants } from '@/app/(admin)/people.actions';
import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import LayoutGridClient from './LayoutGridClient';
import FlexLayoutClient from '@/components/projects/flex/FlexLayoutClient';

export default async function ProjectLayoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  
  const [overview, plots] = await Promise.all([
    getProjectOverview(projectId),
    getProjectPlots(projectId)
  ]);

  if (!overview) {
    notFound();
  }

  const { project } = overview;

  // Branch for flex projects
  if (project.plot_structure === 'flex') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();

    const role = profile?.role ?? 'employee';

    const [flexPlots, clients, consultants] = await Promise.all([
      getFlexPlots(projectId),
      getClients(),
      getConsultants(),
    ]);

    return (
      <FlexLayoutClient
        project={project}
        plots={flexPlots}
        clients={clients}
        consultants={consultants}
        role={role}
      />
    );
  }

  return (
    <LayoutGridClient project={project} plots={plots} />
  );
}

