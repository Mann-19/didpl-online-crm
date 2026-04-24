import { getProjectsWithStats } from '../projects.actions';
import ProjectsListClient from './ProjectsListClient';

export default async function ProjectsPage() {
  const projects = await getProjectsWithStats();

  return (
    <ProjectsListClient initialProjects={projects} />
  );
}
