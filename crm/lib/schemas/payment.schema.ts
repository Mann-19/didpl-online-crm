import { z } from 'zod'

export const PaymentCreateSchema = z.object({
  entity_id: z.string().uuid('Invalid entity ID'),
  entity_type: z.enum(['client', 'investor', 'consultant', 'other']),
  booking_id: z.string().uuid().nullable().optional(),
  transaction_type: z.enum(['credit', 'debit']),
  amount: z.number().positive('Amount must be positive'),
  payment_date: z.string().optional(),
  payment_mode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  commission_amount: z.number().nonnegative().default(0),
  tds_amount: z.number().nonnegative().default(0),
})

export const PaymentUpdateSchema = PaymentCreateSchema.partial()

export type PaymentCreateInput = z.infer<typeof PaymentCreateSchema>
export type PaymentUpdateInput = z.infer<typeof PaymentUpdateSchema>
