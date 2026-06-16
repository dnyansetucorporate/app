import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { enrollmentService } from '@/services/enrollment.service';
import { TableSkeleton } from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PaymentStatusBadge } from '@/components/ui/PaymentStatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';
import { formatDate } from '@/utils/helpers';

interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  branchId: string;
  paymentStatus: 'FULL_PAID' | 'PARTIAL_PAID' | 'PENDING';
  createdAt: string;
  student?: { firstName: string; lastName: string; email: string };
  course?: { name: string };
}

export const EnrollmentList: React.FC = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { searchInput, setSearchInput, searchTerm } = useSearchDebounce(setPage);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (searchTerm) params.search = searchTerm;

      const response: any = await enrollmentService.list(params);
      setEnrollments(response.data || []);
      setTotal(response.meta?.total || response.data?.total || 0);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [page, limit, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await enrollmentService.remove(id);
      toast.success('Enrollment deleted');
      setDeleteId(null);
      setPage(1);
      fetchEnrollments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Enrollments</h1>
        <button
          onClick={() => navigate('/branch-admin/enrollments/create')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} />
          New Enrollment
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="relative">
          <svg className="absolute left-3 top-3 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by student or course..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      {enrollments.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No enrollments found"
          description="Start by creating a new enrollment record"
          action={{ label: 'Create Enrollment', onClick: () => navigate('/branch-admin/enrollments/create') }}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Course</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Enrolled</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {enrollment.student
                      ? `${enrollment.student.firstName} ${enrollment.student.lastName}`.trim()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{enrollment.course?.name}</td>
                  <td className="px-6 py-4">
                    <PaymentStatusBadge status={enrollment.paymentStatus} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(enrollment.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`edit/${enrollment.id}`)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"><Edit2 size={16} /></button>
                      <button onClick={() => setDeleteId(enrollment.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
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
        title="Delete Enrollment"
        message="This action cannot be undone. Are you sure?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default EnrollmentList;
