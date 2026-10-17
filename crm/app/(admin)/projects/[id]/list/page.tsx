import { getProjectOverview, getProjectPlots } from "../../../projects.actions";
import { getFlexPlots } from "@/app/(admin)/flex-plots.actions";
import { getClients, getConsultants } from "@/app/(admin)/people.actions";
import { createClient } from "@/utils/supabase/server";
import ProjectNav from "@/components/projects/ProjectNav";
import BackLink from "@/components/ui/BackLink";
import { notFound } from "next/navigation";
import PlotsDataTable from "@/components/projects/PlotsDataTable";
import FlexListClient from "@/components/projects/flex/FlexListClient";

export default async function ProjectPlotsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const projectId = resolvedParams.id;
  const status =
    typeof resolvedSearchParams.status === "string"
      ? resolvedSearchParams.status
      : undefined;

  const [overview, plots] = await Promise.all([
    getProjectOverview(projectId),
    getProjectPlots(projectId),
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
      <FlexListClient
        project={project}
        plots={flexPlots}
        clients={clients}
        consultants={consultants}
        role={role}
      />
    );
  }

  let displayPlots = plots;
  if (status === "available") {
    displayPlots = plots.filter((plot: any) => {
      const allBookings = plot.bookings || [];
      const hasActiveBooking = allBookings.some(
        (b: any) => b.status === "confirmed" || b.status === "pending",
      );
      return !hasActiveBooking && plot.status === "available";
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header Area */}
        <div className="mb-2">
          <BackLink href="/projects" dirname="All Projects" accent="violet" />
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                {project.name}
              </h1>
              <p className="text-gray-500 mt-1">
                {status === "available"
                  ? `Showing ${displayPlots.length} available plots in this project.`
                  : `Manage and view all ${displayPlots.length} plots in this project.`}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ProjectNav projectId={projectId} />

        {/* Plots Data Table */}
        <div className="mt-6">
          {/* Legend */}
          <div className="mt-6 p-4 bg-violet-50 rounded border border-violet-100">
            <p className="text-sm text-violet-800 flex items-center gap-3">
              <strong>Legend:</strong>
              <span>🟢 Available</span>
              <span>🟡 Token Paid</span>
              <span>🟣 Fully Paid</span>
              <span>🔴 Sold</span>
            </p>
          </div>
          <PlotsDataTable plots={displayPlots} projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
