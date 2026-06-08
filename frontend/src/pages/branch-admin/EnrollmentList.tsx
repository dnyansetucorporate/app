import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { enrollmentService } from '@/services/enrollment.service';
import { TableSkeleton } from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Debounce: update searchTerm + reset page TOGETHER after 400ms
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchEnrollments();
  }, [page, limit, searchTerm]);

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
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
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
          action={{
            label: 'Create Enrollment',
            onClick: () => navigate('/branch-admin/enrollments/create'),
          }}
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
                    {enrollment.student ? `${enrollment.student.firstName} ${enrollment.student.lastName}`.trim() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {enrollment.course?.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-[4px] text-[12px] font-medium ${getStatusBadgeColor(enrollment.paymentStatus)}`}>
                      {getStatusLabel(enrollment.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(enrollment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`edit/${enrollment.id}`)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(enrollment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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
      {enrollments.length > 0 && (
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
