import { getProjectOverview, getProjectPlots } from '../../../projects.actions';
import { notFound } from 'next/navigation';
import LayoutGridClient from './LayoutGridClient';

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

  return (
    <LayoutGridClient project={project} plots={plots} />
  );
}
