import { z } from 'zod'

export const BookingCreateSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  plot_id: z.string().uuid('Invalid plot ID'),
  total_amount: z.number().positive('Total amount must be positive'),
  discount_amount: z.number().nonnegative().default(0),
  consultant_id: z.string().uuid().nullable().optional(),
  commission_percent: z.number().nonnegative().default(0),
  tds_amount: z.number().nonnegative().default(0),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).default('pending'),
  booking_date: z.string().optional(),
  booking_type: z.enum(['single', 'partnership']).default('single'),
})

export const BookingUpdateSchema = BookingCreateSchema.partial()

export type BookingCreateInput = z.infer<typeof BookingCreateSchema>
export type BookingUpdateInput = z.infer<typeof BookingUpdateSchema>
