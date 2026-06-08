import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Eye, Trash2, Search, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentService } from '@/services/payment.service';
import { TableSkeleton } from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

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

  // Debounce: update searchTerm + reset page TOGETHER after 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchPayments();
    return () => { abortControllerRef.current?.abort(); };
  }, [page, limit, searchTerm, statusFilter]);

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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'FULL_PAID':
        return 'border border-[#00A925] text-[#00A925] bg-white';
      case 'PARTIAL_PAID':
        return 'border border-[#EAB308] text-[#EAB308] bg-white';
      case 'PENDING':
        return 'border border-[#64748B] text-[#64748B] bg-white';
      default:
        return 'border border-[#64748B] text-[#64748B] bg-white';
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'FULL_PAID': return 'Full Paid';
      case 'PARTIAL_PAID': return 'Partial Paid';
      case 'PENDING': return 'Pending';
      default: return status;
    }
  };

  const getStudentName = (payment: Payment) => {
    if (payment.enrollment?.student) {
      return `${payment.enrollment.student.firstName || ''} ${payment.enrollment.student.lastName || ''}`.trim();
    }
    return 'N/A';
  };

  const getCourseName = (payment: Payment) => {
    return payment.enrollment?.course?.name || 'N/A';
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
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
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
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
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
          action={{
            label: 'Record Payment',
            onClick: () => navigate('create'),
          }}
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
                      {getStudentName(payment)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {payment.enrollment?.student?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getCourseName(payment)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-blue-600">
                    ₹{Number(payment.feeTaken).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ₹{Number(payment.courseFee).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-[4px] text-[12px] font-medium ${getStatusBadgeColor(payment.paymentStatus)}`}>
                      {getStatusLabel(payment.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`detail/${payment.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`edit/${payment.id}`)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(payment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {payments.length > 0 && (
        <div className="flex items-center justify-center gap-2 bg-white rounded-lg p-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            disabled={page * limit >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
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
