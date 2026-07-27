import { z } from 'zod'

export const ConsultantCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  address: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  account_number: z.string().nullable().optional(),
  ifsc_code: z.string().nullable().optional(),
  pan_number: z.string().nullable().optional(),
  aadhar_number: z.string().nullable().optional(),
})

export const ConsultantUpdateSchema = ConsultantCreateSchema.partial()

export type ConsultantCreateInput = z.infer<typeof ConsultantCreateSchema>
export type ConsultantUpdateInput = z.infer<typeof ConsultantUpdateSchema>
