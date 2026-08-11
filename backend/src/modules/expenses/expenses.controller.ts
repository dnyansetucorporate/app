import { Response } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  listExpenses, getExpenseById, createExpense, updateExpense, deleteExpense,
} from './expenses.service.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

// GET /api/expenses
export const list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { expenses, totals } = await listExpenses(req.query as Record<string, unknown>);
  sendSuccess(res, { expenses, totals }, 'Expenses fetched');
});

// GET /api/expenses/:id
export const get = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const expense = await getExpenseById(req.params.id as string);
  sendSuccess(res, expense);
});

// POST /api/expenses
export const create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const expense = await createExpense(req.body);
  sendSuccess(res, expense, 'Expense added', 201);
});

// PATCH /api/expenses/:id
export const update = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const expense = await updateExpense(req.params.id as string, req.body);
  sendSuccess(res, expense, 'Expense updated');
});

// DELETE /api/expenses/:id
export const remove = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await deleteExpense(req.params.id as string);
  sendSuccess(res, null, 'Expense deleted');
});
