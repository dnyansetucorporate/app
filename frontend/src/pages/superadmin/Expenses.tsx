import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Loader2, X } from 'lucide-react';
import { cn, formatCurrency } from '@/utils/helpers';
import { formatCalendarDate, formatYMD } from '@/utils/date';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { expenseService } from '@/services/expense.service';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import DateInput from '@/components/DateInput';
import toast from '@/utils/toastWrapper';

interface Expense {
  id: string;
  date: string;
  totalIncome: string | number;
  totalExpense: string | number;
  comment: string | null;
}

const emptyForm = { date: '', totalIncome: '', totalExpense: '', comment: '' };

// Default filter range: start and end of the current calendar month.
const getDefaultMonthRange = () => {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: formatYMD(from), to: formatYMD(to) };
};

const Expenses: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  const [activeTab, setActiveTab] = useState<'all' | 'add-expense'>('all');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totals, setTotals] = useState({ totalIncome: 0, totalExpense: 0 });
  const [loading, setLoading] = useState(true);

  const [defaultRange] = useState(getDefaultMonthRange);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPageHeader('Expenses', 'Track daily income and expenses for the institute.');
  }, [setPageHeader]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res: any = await expenseService.list({
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      setExpenses(res.data?.expenses || []);
      setTotals(res.data?.totals || { totalIncome: 0, totalExpense: 0 });
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  const handleResetFilter = () => {
    setDateFrom(defaultRange.from);
    setDateTo(defaultRange.to);
  };

  const isDefaultRange = dateFrom === defaultRange.from && dateTo === defaultRange.to;

  const openAddTab = () => {
    setForm(emptyForm);
    setFormError(null);
    setEditingId(null);
    setActiveTab('add-expense');
  };

  const openEditTab = (expense: Expense) => {
    setForm({
      date: expense.date.slice(0, 10),
      totalIncome: String(expense.totalIncome),
      totalExpense: String(expense.totalExpense),
      comment: expense.comment || '',
    });
    setFormError(null);
    setEditingId(expense.id);
    setActiveTab('add-expense');
  };

  const handleSave = async () => {
    if (!form.date) { setFormError('Date is required'); return; }
    if (form.totalIncome !== '' && Number(form.totalIncome) < 0) { setFormError('Total income cannot be negative'); return; }
    if (form.totalExpense !== '' && Number(form.totalExpense) < 0) { setFormError('Total expense cannot be negative'); return; }

    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        totalIncome: form.totalIncome === '' ? 0 : Number(form.totalIncome),
        totalExpense: form.totalExpense === '' ? 0 : Number(form.totalExpense),
        comment: form.comment.trim() || undefined,
      };
      if (editingId) {
        await expenseService.update(editingId, payload);
        toast.success('Expense updated successfully');
      } else {
        await expenseService.create(payload);
        toast.success('Expense added successfully');
      }
      setForm(emptyForm);
      setEditingId(null);
      setActiveTab('all');
      fetchExpenses();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await expenseService.remove(deleteTarget.id);
      toast.success('Expense deleted successfully');
      setDeleteTarget(null);
      fetchExpenses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  const total = expenses.length;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-[8px] p-1 w-fit shadow-sm">
          {(['all', 'add-expense'] as const).map((tab) => {
            const labels = { all: 'All Expenses', 'add-expense': editingId ? 'Edit Expense' : 'Add New Expense' };
            return (
              <button
                key={tab}
                onClick={() => (tab === 'add-expense' ? openAddTab() : setActiveTab(tab))}
                className={cn(
                  'px-6 py-2.5 rounded-[6px] text-[15px] font-medium transition-colors',
                  activeTab === tab ? 'bg-[#C8102E] text-white' : 'text-[#1A2332] hover:bg-gray-50'
                )}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* === ALL EXPENSES === */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-[18px] font-bold text-[#1A2332]">All Expenses ({total})</h3>
            <div className="flex items-center gap-3">
              <DateInput
                value={dateFrom}
                onChange={setDateFrom}
                max={dateTo || undefined}
                placeholder="From date"
                className="h-10 px-3 border border-[#E2E8F0] rounded-md text-[13px] text-[#1A2332] min-w-[150px]"
              />
              <span className="text-[#94A3B8] text-sm">to</span>
              <DateInput
                value={dateTo}
                onChange={setDateTo}
                min={dateFrom || undefined}
                placeholder="To date"
                className="h-10 px-3 border border-[#E2E8F0] rounded-md text-[13px] text-[#1A2332] min-w-[150px]"
              />
              {!isDefaultRange && (
                <button
                  onClick={handleResetFilter}
                  className="flex items-center gap-1 text-[13px] text-[#64748B] hover:text-[#C8102E] transition-colors"
                >
                  <X size={14} />
                  Reset to this month
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium whitespace-nowrap w-20">Sr. No</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Date</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Total Income</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Total Expense</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Comment</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="animate-spin text-[#4DB8CA]" size={32} />
                        <p className="text-gray-400">Loading expenses...</p>
                      </div>
                    </td>
                  </tr>
                ) : expenses.map((expense, idx) => (
                  <tr key={expense.id} className={cn('hover:bg-[#F8FAFC] transition-colors', idx % 2 === 1 && 'bg-[#F8FAFC]')}>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{formatCalendarDate(expense.date)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#0BB783] font-medium">{formatCurrency(expense.totalIncome)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#C8102E] font-medium">{formatCurrency(expense.totalExpense)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#64748B] max-w-xs truncate" title={expense.comment || ''}>{expense.comment || '—'}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openEditTab(expense)}
                          title="Edit"
                          className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(expense)}
                          title="Delete"
                          className="text-[#C8102E] border border-[#C8102E] rounded-[4px] p-1.5 bg-[#FEF2F2] hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">No expenses found.</td>
                  </tr>
                )}
              </tbody>
              {!loading && expenses.length > 0 && (
                <tfoot>
                  <tr className="bg-[#F1F5F9] border-t-2 border-[#E2E8F0]">
                    <td colSpan={2} className="py-4 px-6 text-[14px] font-bold text-[#1A2332]">Totals</td>
                    <td className="py-4 px-6 text-[14px] font-bold text-[#0BB783]">{formatCurrency(totals.totalIncome)}</td>
                    <td className="py-4 px-6 text-[14px] font-bold text-[#C8102E]">{formatCurrency(totals.totalExpense)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="flex items-center px-6 py-4 border-t border-[#E2E8F0] bg-white">
            <p className="text-[14px] text-[#64748B]">Showing all {total} {total === 1 ? 'entry' : 'entries'} for the selected date range</p>
          </div>
        </div>
      )}

      {/* === ADD / EDIT EXPENSE === */}
      {activeTab === 'add-expense' && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-8">
          {editingId && (
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#E2E8F0]">
              <span className="text-[13px] font-semibold text-[#4DB8CA] bg-[#E6F6F9] px-3 py-1 rounded-full">Editing Expense</span>
              <span className="text-[13px] text-[#64748B]">— modify the details below and save</span>
            </div>
          )}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="block text-[14px] font-semibold text-[#1A2332]">
                  Date <span className="text-[#C8102E]">*</span>
                </label>
                <DateInput
                  value={form.date}
                  onChange={(v) => setForm(f => ({ ...f, date: v }))}
                  className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none focus:border-[#4DB8CA]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[14px] font-semibold text-[#1A2332]">Total Income</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={form.totalIncome}
                  onChange={(e) => setForm(f => ({ ...f, totalIncome: e.target.value }))}
                  className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[14px] font-semibold text-[#1A2332]">Total Expense</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={form.totalExpense}
                  onChange={(e) => setForm(f => ({ ...f, totalExpense: e.target.value }))}
                  className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[14px] font-semibold text-[#1A2332]">Comment</label>
              <textarea
                rows={3}
                placeholder="Add a note about this entry (optional)"
                value={form.comment}
                onChange={(e) => setForm(f => ({ ...f, comment: e.target.value }))}
                className="w-full px-4 py-3 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA] resize-none"
              />
            </div>

            {formError && <p className="text-[#C8102E] text-[13px]">{formError}</p>}

            <div className="flex items-center justify-end gap-6 pt-6 border-t border-[#E2E8F0] mt-8">
              <button onClick={() => setActiveTab('all')} className="text-[14px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors">
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="flex items-center gap-2 px-8 py-3 bg-[#C8102E] text-white rounded-[6px] text-[15px] font-medium hover:bg-red-800 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                {saving ? 'Saving...' : editingId ? 'Update Expense' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Expense"
        message={deleteTarget ? `Are you sure you want to delete the entry for ${formatCalendarDate(deleteTarget.date)}? This action cannot be undone.` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleting}
      />
    </div>
  );
};

export default Expenses;
