import { z } from 'zod'

export const ClientCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  gender: z.enum(['Male', 'Female', 'Other']).nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  birthdate: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  pan_number: z.string().nullable().optional(),
  aadhar_number: z.string().nullable().optional(),
  residential_address: z.string().nullable().optional(),
  residential_state: z.string().nullable().optional(),
  residential_city: z.string().nullable().optional(),
  residential_pincode: z.string().nullable().optional(),
  office_address: z.string().nullable().optional(),
  office_state: z.string().nullable().optional(),
  office_city: z.string().nullable().optional(),
  office_pincode: z.string().nullable().optional(),
})

export const ClientUpdateSchema = ClientCreateSchema.partial()

export type ClientCreateInput = z.infer<typeof ClientCreateSchema>
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>
