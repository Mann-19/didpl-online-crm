import { z } from 'zod'

export const ExpenseCreateSchema = z.object({
  expense_date: z.string().optional(),
  to_entity: z.string().min(1, 'Recipient is required'),
  expense_type: z.string().min(1, 'Expense type is required'),
  payment_mode: z.string().nullable().optional(),
  transaction_id: z.string().nullable().optional(),
  amount: z.number().positive('Amount must be positive'),
  bank_name: z.string().nullable().optional(),
  branch_name: z.string().nullable().optional(),
  ifsc_code: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
})

export const ExpenseUpdateSchema = ExpenseCreateSchema.partial()

export type ExpenseCreateInput = z.infer<typeof ExpenseCreateSchema>
export type ExpenseUpdateInput = z.infer<typeof ExpenseUpdateSchema>
