import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { scheduleService } from '@/services/schedule.service';
import { TableSkeleton } from '@/components/SkeletonLoader';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Schedule {
  id: string;
  branchId: string;
  courseId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  isActive: boolean;
  course?: { name: string };
  branch?: { name: string };
}

export const ScheduleList: React.FC = () => {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [dayFilter, setDayFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (dayFilter) params.dayOfWeek = dayFilter;
      
      const response: any = await scheduleService.list(params);
      setSchedules(response.data.schedules || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [page, limit, dayFilter]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await scheduleService.remove(id);
      toast.success('Schedule deleted');
      setDeleteId(null);
      setPage(1);
      fetchSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Class Schedules</h1>
        <button
          onClick={() => navigate('create')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={20} />
          New Schedule
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <select
          value={dayFilter}
          onChange={(e) => {
            setDayFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Days</option>
          {days.map((day) => (
            <option key={day} value={day}>
              {day}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {schedules.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No schedules found"
          description="Start by creating a new class schedule"
          action={{
            label: 'Create Schedule',
            onClick: () => navigate('create'),
          }}
        />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Course</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Branch</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Day</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {schedule.course?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {schedule.branch?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {schedule.dayOfWeek}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {schedule.startTime} - {schedule.endTime}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {schedule.location}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      schedule.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {schedule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`edit/${schedule.id}`)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(schedule.id)}
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
      {schedules.length > 0 && (
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
        title="Delete Schedule"
        message="This action cannot be undone. Are you sure?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ScheduleList;
