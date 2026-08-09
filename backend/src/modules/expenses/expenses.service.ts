import { prisma } from '../../config/prisma.js';
import type { ExpenseQuery, CreateExpenseDto, UpdateExpenseDto } from './expenses.schema.js';

const buildDateWhere = (q: ExpenseQuery) => {
  const where: Record<string, unknown> = {};
  if (q.from || q.to) {
    const date: Record<string, Date> = {};
    if (q.from) date.gte = new Date(q.from);
    if (q.to) {
      const toDate = new Date(q.to);
      toDate.setHours(23, 59, 59, 999);
      date.lte = toDate;
    }
    where.date = date;
  }
  return where;
};

export const listExpenses = async (query: Record<string, unknown>) => {
  const q = query as unknown as ExpenseQuery;
  const where = buildDateWhere(q);

  const [expenses, agg] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { date: 'desc' } }),
    prisma.expense.aggregate({ _sum: { totalIncome: true, totalExpense: true }, where }),
  ]);

  const totals = {
    totalIncome: Number(agg._sum.totalIncome ?? 0),
    totalExpense: Number(agg._sum.totalExpense ?? 0),
  };

  return { expenses, totals };
};

export const getExpenseById = async (id: string) => {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) throw Object.assign(new Error('Expense not found'), { status: 404 });
  return expense;
};

export const createExpense = async (data: CreateExpenseDto) => {
  return prisma.expense.create({
    data: {
      date: new Date(data.date),
      totalIncome: data.totalIncome,
      totalExpense: data.totalExpense,
      comment: data.comment,
    },
  });
};

export const updateExpense = async (id: string, data: UpdateExpenseDto) => {
  const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw Object.assign(new Error('Expense not found'), { status: 404 });

  const { date, ...rest } = data;
  return prisma.expense.update({
    where: { id },
    data: {
      ...rest,
      ...(date ? { date: new Date(date) } : {}),
    },
  });
};

export const deleteExpense = async (id: string) => {
  const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw Object.assign(new Error('Expense not found'), { status: 404 });
  await prisma.expense.delete({ where: { id } });
};
