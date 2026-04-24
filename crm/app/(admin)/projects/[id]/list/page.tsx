import { getProjectOverview, getProjectPlots } from '../../../projects.actions';
import ProjectNav from '@/components/projects/ProjectNav';
import BackLink from '@/components/ui/BackLink';
import { notFound } from 'next/navigation';
import PlotsDataTable from '@/components/projects/PlotsDataTable';

export default async function ProjectPlotsListPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="min-h-screen bg-gray-50 font-sans animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header Area */}
        <div className="mb-2">
          <BackLink href="/projects" dirname="All Projects" accent="violet" />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
              <p className="text-gray-500 mt-1">Manage and view all {plots.length} plots in this project.</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ProjectNav projectId={projectId} />

        {/* Plots Data Table */}
        <div className="mt-6">
          <PlotsDataTable plots={plots} projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
