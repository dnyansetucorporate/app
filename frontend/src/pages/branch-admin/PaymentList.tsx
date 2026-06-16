import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Eye, Trash2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentService } from '@/services/payment.service';
import { TableSkeleton } from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PaymentStatusBadge } from '@/components/ui/PaymentStatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';
import { formatDate } from '@/utils/helpers';

interface Payment {
  id: string;
  enrollmentId: string;
  feeTaken: string | number;
  courseFee: string | number;
  paymentStatus: 'FULL_PAID' | 'PARTIAL_PAID' | 'PENDING';
  paidAt: string | null;
  createdAt: string;
  enrollment?: {
    id: string;
    student?: { firstName: string; lastName: string; email: string };
    course?: { name: string };
  };
}

export const PaymentList: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const { searchInput, setSearchInput, searchTerm } = useSearchDebounce(setPage);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      abortControllerRef.current = new AbortController();
      const params: any = { page, limit };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.paymentStatus = statusFilter;

      const response: any = await paymentService.list(params);
      setPayments(response.data || []);
      setTotal(response.meta?.total || response.data?.total || 0);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast.error(error.response?.data?.message || 'Failed to load payments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    return () => { abortControllerRef.current?.abort(); };
  }, [page, limit, searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await paymentService.remove(id);
      toast.success('Payment deleted successfully');
      setDeleteId(null);
      setPage(1);
      await fetchPayments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Payments (Installments)</h1>
        <button
          onClick={() => navigate('create')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <svg className="absolute left-3 top-3 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search by student name, course, email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="FULL_PAID">Full Paid</option>
            <option value="PARTIAL_PAID">Partial Paid</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments found"
          description="Start by recording a payment for a course enrollment or adjust your filters"
          action={{ label: 'Record Payment', onClick: () => navigate('create') }}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Course</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fee Taken</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total Fee</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.enrollment?.student
                        ? `${payment.enrollment.student.firstName || ''} ${payment.enrollment.student.lastName || ''}`.trim()
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">{payment.enrollment?.student?.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{payment.enrollment?.course?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">₹{Number(payment.feeTaken).toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{Number(payment.courseFee).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <PaymentStatusBadge status={payment.paymentStatus} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(payment.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`detail/${payment.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View"><Eye size={16} /></button>
                      <button onClick={() => navigate(`edit/${payment.id}`)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Edit"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteId(payment.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPage={setPage} />

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Payment"
        message="This action cannot be undone. Are you sure you want to delete this payment record?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default PaymentList;
