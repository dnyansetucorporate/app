import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Download, Upload, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/helpers';
import toast from '@/utils/toastWrapper';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useAuth } from '@/contexts/AuthContext';
import { settingsService } from '@/services/settings.service';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type SettingsTab = 'backup' | 'danger';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'backup', label: 'Backup & Restore' },
  { key: 'danger', label: 'Danger Zone' },
];

const Settings: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  useEffect(() => { setPageHeader('Settings', 'Manage system settings'); }, []);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('backup');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const blob: Blob = await (settingsService.exportBackup() as unknown as Promise<Blob>);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch {
      toast.error('Failed to export backup');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setRestoreFile(file);
    if (file) setRestoreConfirmOpen(true);
  };

  const handleImportBackup = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      await settingsService.importBackup(restoreFile);
      toast.success('Backup restored successfully.');
      setRestoreConfirmOpen(false);
      logout();
      navigate('/auth/login');
    } catch {
      toast.error('Failed to restore backup');
    } finally {
      setRestoring(false);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelRestore = () => {
    setRestoreConfirmOpen(false);
    setRestoreFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-[8px] p-1 w-fit shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-6 py-2.5 rounded-[6px] text-[15px] font-medium transition-colors',
              activeTab === tab.key ? 'bg-[#C8102E] text-white' : 'text-[#1A2332] hover:bg-gray-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === Backup & Restore === */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="rounded-[16px] p-6 bg-gradient-to-r from-[#0A3D4D] to-[#1A7A8E] text-white flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="font-semibold">Keep your data safe</p>
              <p className="text-[13px] text-white/80 mt-0.5">
                Export a fresh backup regularly, and especially right before restoring one or making major changes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="group bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all p-7 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#0A3D4D] flex items-center justify-center mb-4">
                <Download size={24} className="text-white" />
              </div>
              <p className="text-[16px] font-bold text-[#1A2332]">Export Backup</p>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Download a full backup containing the database and all uploaded photos/logos.
              </p>
              <button
                onClick={handleExportBackup}
                disabled={exporting}
                className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0A3D4D] hover:bg-[#082C38] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-[6px] transition-colors shadow-sm"
              >
                <Download size={16} /> {exporting ? 'Exporting...' : 'Export Backup'}
              </button>
            </div>

            <div className="group bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all p-7 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-white border-2 border-[#C8102E] flex items-center justify-center mb-4">
                <Upload size={24} className="text-[#C8102E]" />
              </div>
              <p className="text-[16px] font-bold text-[#1A2332]">Import Backup</p>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed">
                Restore from a previously exported backup file (.tar.gz). This{' '}
                <span className="font-semibold text-[#C8102E]">overwrites all current data</span>.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".tar.gz,.tgz"
                onChange={handleFileSelected}
                className="hidden"
                id="backup-file-input"
              />
              <label
                htmlFor="backup-file-input"
                className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-2.5 border border-[#C8102E] text-[#C8102E] hover:bg-red-50 text-[14px] font-medium rounded-[6px] transition-colors cursor-pointer"
              >
                <Upload size={16} /> Import Backup
              </label>
            </div>
          </div>
        </div>
      )}

      {/* === Danger Zone === */}
      {activeTab === 'danger' && (
        <div className="bg-red-50 rounded-[16px] border border-red-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-7">
          <div className="bg-white rounded-[16px] border border-red-100 p-7 flex items-start gap-5">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#C8102E] flex items-center justify-center">
              <AlertTriangle size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-bold text-[#1A2332]">Clear Database</p>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed max-w-lg">
                Permanently deletes all branches, students, courses, exams, enrollments,
                payments and certificates. The Super Admin account is the only record kept.
                This action <span className="font-semibold text-[#C8102E]">cannot be undone</span>.
              </p>
              <button
                onClick={() => setConfirmOpen(true)}
                className="mt-5 flex items-center gap-2 px-6 py-2.5 bg-[#C8102E] hover:bg-red-800 text-white text-[14px] font-medium rounded-[6px] transition-colors shadow-sm"
              >
                <Trash2 size={16} /> Clear DB
              </button>
            </div>
          </div>
        </div>
      )}

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

      <ConfirmDialog
        isOpen={restoreConfirmOpen}
        title="Restore From Backup?"
        message={`This will overwrite ALL current data (database and uploaded files) with the contents of "${restoreFile?.name ?? 'the selected backup'}". This cannot be undone. You will be logged out afterwards.`}
        confirmText="Yes, Restore Backup"
        cancelText="Cancel"
        isDangerous
        isLoading={restoring}
        onConfirm={handleImportBackup}
        onCancel={cancelRestore}
      />
    </div>
  );
};

export default Settings;
