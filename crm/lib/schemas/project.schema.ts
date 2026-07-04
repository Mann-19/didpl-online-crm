import { z } from 'zod'

export const ProjectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  total_plots: z.number().int().nonnegative().optional(),
  area_size: z.number().positive().nullable().optional(),
  status: z.enum(['active', 'inactive', 'completed']).default('active'),
})

export const ProjectUpdateSchema = ProjectCreateSchema.partial()

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>
