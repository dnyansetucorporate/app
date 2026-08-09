import { z } from 'zod';

export const expenseQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const createExpenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  totalIncome: z.coerce.number().min(0, 'Total income cannot be negative').default(0),
  totalExpense: z.coerce.number().min(0, 'Total expense cannot be negative').default(0),
  comment: z.string().optional().or(z.literal('').transform(() => undefined)),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
export type CreateExpenseDto = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseSchema>;
