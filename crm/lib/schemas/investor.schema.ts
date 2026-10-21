import { z } from 'zod'

export const InvestorCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).nullable().optional(),
  address: z.string().nullable().optional(),
  referral_id: z.string().nullable().optional(),
  investor_code: z.string().optional(),
})

export const InvestorUpdateSchema = InvestorCreateSchema.partial()

export const InvestmentCreateSchema = z.object({
  investor_id: z.string().uuid('Invalid investor ID'),
  invested_amount: z.number().positive('Invested amount must be positive'),
  interest_rate: z.number().nonnegative(),
  mature_amount: z.number().positive(),
  investment_date: z.string().optional(),
  mature_date: z.string(),
  payment_mode: z.string().nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  referral_user_id: z.string().uuid().nullable().optional(),
  status: z.enum(['pending', 'settled']).optional(),
  exit_date: z.string().nullable().optional(),
  investment_code: z.string().optional(),
})

export const InvestmentUpdateSchema = InvestmentCreateSchema.partial()

export type InvestorCreateInput = z.infer<typeof InvestorCreateSchema>
export type InvestorUpdateInput = z.infer<typeof InvestorUpdateSchema>
export type InvestmentCreateInput = z.infer<typeof InvestmentCreateSchema>
export type InvestmentUpdateInput = z.infer<typeof InvestmentUpdateSchema>
