import { z } from 'zod'

export const EmployeeCreateSchema = z.object({
  designation: z.string().nullable().optional(),
  salary: z.number().nonnegative().nullable().optional(),
  joining_date: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  emergency_contact: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  account_number: z.string().nullable().optional(),
  ifsc_code: z.string().nullable().optional(),
  pan_number: z.string().nullable().optional(),
})

export const EmployeeUpdateSchema = EmployeeCreateSchema.partial()

export type EmployeeCreateInput = z.infer<typeof EmployeeCreateSchema>
export type EmployeeUpdateInput = z.infer<typeof EmployeeUpdateSchema>
