import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle } from 'lucide-react';
import toast from '@/utils/toastWrapper';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useAuth } from '@/contexts/AuthContext';
import { settingsService } from '@/services/settings.service';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const Settings: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  useEffect(() => { setPageHeader('Settings', 'Manage system settings'); }, []);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearDb = async () => {
    setClearing(true);
    try {
      await settingsService.clearDatabase();
      toast.success('Database cleared. All data has been removed.');
      setConfirmOpen(false);
      logout();
      navigate('/auth/login');
    } catch {
      toast.error('Failed to clear database');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50">
          <h2 className="text-base font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle size={16} /> Danger Zone
          </h2>
        </div>
        <div className="px-6 py-5 flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-900">Clear Database</p>
            <p className="text-sm text-gray-500 mt-1">
              Permanently deletes all branches, students, courses, exams, enrollments,
              payments and certificates. The Super Admin account is the only record kept.
              This action <span className="font-semibold text-red-600">cannot be undone</span>.
            </p>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 size={15} /> Clear DB
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Clear Entire Database?"
        message="This will permanently delete ALL branches, students, courses, exams, enrollments, payments and certificates. Only the Super Admin account will remain. This cannot be undone."
        confirmText="Yes, Clear Everything"
        cancelText="Cancel"
        isDangerous
        isLoading={clearing}
        onConfirm={handleClearDb}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default Settings;
