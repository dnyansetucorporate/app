import React, { useEffect, useState } from 'react';
import { Search, Eye, Trash2, Loader2, CheckCircle2, Plus, X } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { enquiryService } from '@/services/enquiry.service';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';
import { formatCalendarDate } from '@/utils/date';
import DateInput from '@/components/DateInput';
import ConfirmDialog from '@/components/ConfirmDialog';
import { EnquiryDetailDrawer } from '@/components/EnquiryDetailDrawer';
import toast from '@/utils/toastWrapper';

const inputClass = 'w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA]';
const labelClass = 'text-[14px] font-semibold text-[#1A2332]';
const today = () => new Date().toISOString().split('T')[0];

const emptyForm = {
  name: '',
  contactNo: '',
  source: '',
  courseEnrolledFor: '',
  enquiryDate: today(),
  address: '',
  education: '',
  dob: '',
  feeStructure: '',
  admissionTaken: false,
  admissionDate: '',
  joiningDate: '',
  courseTime: '',
  remark: '',
};

const emptyFollowUpRow = { date: '', note: '' };

const Enquiries: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  const [activeTab, setActiveTab] = useState<'all' | 'new'>('all');

  // ── All Enquiries tab ──
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const PAGE_SIZE = 10;
  const { searchInput, setSearchInput, searchTerm: search } = useSearchDebounce(setCurrentPage);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── New Enquiry tab ──
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [followUpRows, setFollowUpRows] = useState<{ date: string; note: string }[]>([{ ...emptyFollowUpRow }]);

  useEffect(() => {
    setPageHeader('Enquiries', 'Capture and follow up on walk-in and phone enquiries for your branch.', undefined, false);
  }, [setPageHeader]);

  useEffect(() => {
    if (activeTab === 'all') fetchEnquiries();
  }, [activeTab, currentPage, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res: any = await enquiryService.list({ page: currentPage, limit: PAGE_SIZE, search: search || undefined });
      setEnquiries(res?.data || []);
      setMeta(res?.meta || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  };

  const openEnquiry = async (id: string) => {
    try {
      const res: any = await enquiryService.getById(id);
      setSelectedEnquiry(res?.data || res);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load enquiry details');
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await enquiryService.remove(id);
      toast.success('Enquiry deleted');
      setDeleteId(null);
      fetchEnquiries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete enquiry');
    } finally {
      setIsDeleting(false);
    }
  };

  const set = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateFields = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const indianPhone = /^[6-9]\d{9}$/;

    if (!formData.name.trim()) errs.name = 'Name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';

    if (!formData.contactNo.trim()) errs.contactNo = 'Contact number is required';
    else if (!indianPhone.test(formData.contactNo.trim())) errs.contactNo = 'Must be a valid Indian mobile number (10 digits, starting with 6–9)';

    if (!formData.enquiryDate) errs.enquiryDate = 'Enquiry date is required';

    if (formData.admissionTaken && !formData.admissionDate) errs.admissionDate = 'Admission date is required';

    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validateFields());
  };

  const updateFollowUpRow = (idx: number, field: 'date' | 'note', value: string) => {
    setFollowUpRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const addFollowUpRow = () => setFollowUpRows((prev) => [...prev, { ...emptyFollowUpRow }]);

  const removeFollowUpRow = (idx: number) => {
    setFollowUpRows((prev) => (prev.length === 1 ? [{ ...emptyFollowUpRow }] : prev.filter((_, i) => i !== idx)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateFields();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      const allTouched: Record<string, boolean> = {};
      Object.keys(fieldErrors).forEach((k) => { allTouched[k] = true; });
      setTouched((prev) => ({ ...prev, ...allTouched }));
      return;
    }

    const completeFollowUps = followUpRows.filter((r) => r.date && r.note.trim());
    const incompleteRows = followUpRows.some((r) => (r.date || r.note.trim()) && !(r.date && r.note.trim()));

    setSubmitting(true);
    try {
      const res: any = await enquiryService.create(formData);
      const newEnquiryId = res?.data?.id;

      if (newEnquiryId && completeFollowUps.length) {
        await Promise.all(
          completeFollowUps.map((r) => enquiryService.addFollowUp(newEnquiryId, { date: r.date, note: r.note.trim() }))
        );
      }

      toast.success('Enquiry added successfully');
      if (incompleteRows) toast.error('One or more follow-up rows were incomplete and skipped');
      setFormData(emptyForm);
      setErrors({});
      setTouched({});
      setFollowUpRows([{ ...emptyFollowUpRow }]);
      setActiveTab('all');
      setCurrentPage(1);
      fetchEnquiries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-[8px] p-1 w-fit shadow-sm">
        {(['all', 'new'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-2.5 rounded-[6px] text-[15px] font-medium transition-colors',
              activeTab === tab ? 'bg-[#C8102E] text-white' : 'text-[#1A2332] hover:bg-gray-50'
            )}
          >
            {tab === 'all' ? 'All Enquiries' : 'New Enquiry'}
          </button>
        ))}
      </div>

      {/* ── All Enquiries ── */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden border border-[#E2E8F0]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <h4 className="text-[18px] font-bold text-[#1A2332]">
              Enquiries ({meta?.total ?? enquiries.length})
            </h4>
            <div className="flex items-center gap-2 w-full max-w-xs px-3 py-2 bg-white border border-[#E2E8F0] rounded-[8px]">
              <Search size={16} className="text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by name, contact, course"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Sr. No</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Name</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Contact No</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Course Enrolled For</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Enquiry Date</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap">Admission</th>
                  <th className="py-4 px-6 font-medium whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-500">Loading enquiries...</td></tr>
                ) : enquiries.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-500">No enquiries found.</td></tr>
                ) : (
                  enquiries.map((enq, idx) => (
                    <tr key={enq.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332] font-medium">{enq.name}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{enq.contactNo}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{enq.courseEnrolledFor || '—'}</td>
                      <td className="py-4 px-6 text-[14px] text-[#1A2332]">{formatCalendarDate(enq.enquiryDate)}</td>
                      <td className="py-4 px-6 text-[14px]">
                        <span className={cn(
                          'px-3 py-1 rounded-[4px] border text-[12px] font-medium bg-white',
                          enq.admissionTaken ? 'border-[#00A925] text-[#00A925]' : 'border-[#64748B] text-[#64748B]'
                        )}>
                          {enq.admissionTaken ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                            onClick={() => openEnquiry(enq.id)}
                            title="View / Edit"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="text-[#C8102E] border border-[#C8102E] rounded-[4px] p-1.5 hover:bg-[#FDECEC] transition-colors"
                            onClick={() => setDeleteId(enq.id)}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(() => {
            const total = meta?.total ?? enquiries.length;
            const totalPages = meta?.totalPages ?? 1;
            const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
            const to = Math.min(currentPage * PAGE_SIZE, total);
            const windowSize = 4;
            let start = Math.max(1, currentPage - 1);
            let end = Math.min(totalPages, start + windowSize - 1);
            start = Math.max(1, end - windowSize + 1);
            const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            return (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
                <p className="text-[14px] text-[#64748B]">Showing data {from} to {to} of {total} Enquiries</p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><span className="text-sm font-bold">{'<'}</span></button>
                  {start > 1 && <span className="px-1 text-[#94A3B8]">...</span>}
                  {pages.map((p) => (
                    <button key={p} onClick={() => setCurrentPage(p)} className={cn('w-8 h-8 flex items-center justify-center rounded text-[14px] transition-colors', p === currentPage ? 'bg-[#0A3D4D] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-gray-50')}>{p}</button>
                  ))}
                  {end < totalPages && <span className="px-1 text-[#94A3B8]">...</span>}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"><span className="text-sm font-bold">{'>'}</span></button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── New Enquiry ── */}
      {activeTab === 'new' && (
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-[8px] p-6 sm:p-8 max-w-screen-lg w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Name <span className="text-[#C8102E]">*</span></label>
                <input
                  value={formData.name}
                  onChange={(e) => set('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="Enter enquirer's name"
                  className={cn(inputClass, touched.name && errors.name ? 'border-[#C8102E]' : 'border-[#E2E8F0]')}
                />
                {touched.name && errors.name && <p className="text-[12px] text-[#C8102E]">{errors.name}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Contact No. <span className="text-[#C8102E]">*</span></label>
                <input
                  value={formData.contactNo}
                  onChange={(e) => set('contactNo', e.target.value)}
                  onBlur={() => handleBlur('contactNo')}
                  placeholder="Enter contact number"
                  className={cn(inputClass, touched.contactNo && errors.contactNo ? 'border-[#C8102E]' : 'border-[#E2E8F0]')}
                />
                {touched.contactNo && errors.contactNo && <p className="text-[12px] text-[#C8102E]">{errors.contactNo}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Enquiry Date <span className="text-[#C8102E]">*</span></label>
                <DateInput
                  value={formData.enquiryDate}
                  onChange={(v) => set('enquiryDate', v)}
                  onBlur={() => handleBlur('enquiryDate')}
                  max={today()}
                  className={cn(inputClass, touched.enquiryDate && errors.enquiryDate ? 'border-[#C8102E]' : 'border-[#E2E8F0]')}
                />
                {touched.enquiryDate && errors.enquiryDate && <p className="text-[12px] text-[#C8102E]">{errors.enquiryDate}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>How You Know About Dnyansetu</label>
                <input
                  value={formData.source}
                  onChange={(e) => set('source', e.target.value)}
                  placeholder="e.g. Facebook Ad, Walk-in, Referral"
                  className={cn(inputClass, 'border-[#E2E8F0]')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Course Enrolled For</label>
                <input
                  value={formData.courseEnrolledFor}
                  onChange={(e) => set('courseEnrolledFor', e.target.value)}
                  placeholder="Enter course name"
                  className={cn(inputClass, 'border-[#E2E8F0]')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Education</label>
                <input
                  value={formData.education}
                  onChange={(e) => set('education', e.target.value)}
                  placeholder="Enter highest qualification"
                  className={cn(inputClass, 'border-[#E2E8F0]')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Date of Birth</label>
                <DateInput
                  value={formData.dob}
                  onChange={(v) => set('dob', v)}
                  max={today()}
                  className={cn(inputClass, 'border-[#E2E8F0]')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className={labelClass}>Address</label>
                <input
                  value={formData.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Enter address"
                  className={cn(inputClass, 'border-[#E2E8F0]')}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Fee Structure</label>
              <textarea
                value={formData.feeStructure}
                onChange={(e) => set('feeStructure', e.target.value)}
                rows={3}
                placeholder="Notes on the fee structure discussed with the enquirer"
                className={cn(inputClass, 'h-auto py-3 resize-none border-[#E2E8F0]')}
              />
            </div>

            {/* Admission Taken */}
            <div className="flex flex-col gap-4 pt-2 border-t border-[#E2E8F0]">
              <label className="flex items-center gap-2.5 cursor-pointer select-none pt-4">
                <input
                  type="checkbox"
                  checked={formData.admissionTaken}
                  onChange={(e) => set('admissionTaken', e.target.checked)}
                  className="w-4 h-4 rounded border-[#E2E8F0] text-[#0A3D4D] focus:ring-[#4DB8CA]"
                />
                <span className={labelClass}>Admission Taken</span>
              </label>

              {formData.admissionTaken && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Admission Date <span className="text-[#C8102E]">*</span></label>
                    <DateInput
                      value={formData.admissionDate}
                      onChange={(v) => set('admissionDate', v)}
                      onBlur={() => handleBlur('admissionDate')}
                      className={cn(inputClass, touched.admissionDate && errors.admissionDate ? 'border-[#C8102E]' : 'border-[#E2E8F0]')}
                    />
                    {touched.admissionDate && errors.admissionDate && <p className="text-[12px] text-[#C8102E]">{errors.admissionDate}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Joining Date</label>
                    <DateInput value={formData.joiningDate} onChange={(v) => set('joiningDate', v)} className={cn(inputClass, 'border-[#E2E8F0]')} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={labelClass}>Course Time</label>
                    <input
                      value={formData.courseTime}
                      onChange={(e) => set('courseTime', e.target.value)}
                      placeholder="e.g. 10:00 AM - 12:00 PM"
                      className={cn(inputClass, 'border-[#E2E8F0]')}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className={labelClass}>Remark</label>
              <textarea
                value={formData.remark}
                onChange={(e) => set('remark', e.target.value)}
                rows={2}
                placeholder="Any additional remark"
                className={cn(inputClass, 'h-auto py-3 resize-none border-[#E2E8F0]')}
              />
            </div>

            {/* Follow Up */}
            <div className="flex flex-col gap-3 pt-2 border-t border-[#E2E8F0]">
              <label className={cn(labelClass, 'pt-4')}>Follow Up</label>

              {/* No overflow-hidden here — it would clip the DateInput calendar popover
                  that opens out of the Date column's cell. */}
              <div className="border border-[#E2E8F0] rounded-[8px]">
                <table className="w-full text-[13px]">
                  <thead className="border-b border-[#E2E8F0]">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[#64748B] font-medium w-48 bg-[#F8FAFC] rounded-tl-[8px]">Date</th>
                      <th className="text-left px-4 py-2.5 text-[#64748B] font-medium bg-[#F8FAFC]">Follow Up</th>
                      <th className="w-12 bg-[#F8FAFC] rounded-tr-[8px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {followUpRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5">
                          <DateInput
                            value={row.date}
                            onChange={(v) => updateFollowUpRow(idx, 'date', v)}
                            max={today()}
                            className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-md text-[13px] text-[#1A2332] outline-none focus:border-[#4DB8CA]"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            value={row.note}
                            onChange={(e) => updateFollowUpRow(idx, 'note', e.target.value)}
                            placeholder="e.g. Called, will visit next week"
                            className="w-full h-9 px-3 bg-white border border-[#E2E8F0] rounded-md text-[13px] text-[#1A2332] outline-none focus:border-[#4DB8CA]"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeFollowUpRow(idx)}
                            className="text-[#C8102E] hover:bg-[#FDECEC] rounded p-1 transition-colors"
                            title="Remove row"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addFollowUpRow}
                className="w-fit flex items-center gap-1.5 text-[13px] font-medium text-[#4DB8CA] hover:underline"
              >
                <Plus size={14} /> Add Another Follow Up
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#C8102E] text-white px-8 py-2.5 rounded-[4px] text-[14px] font-medium hover:bg-red-800 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Save Enquiry
              </button>
              <button
                type="button"
                onClick={() => { setFormData(emptyForm); setErrors({}); setTouched({}); setFollowUpRows([{ ...emptyFollowUpRow }]); }}
                className="px-8 py-2.5 border border-[#E2E8F0] rounded-[4px] text-[14px] font-medium text-[#64748B] hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedEnquiry && (
        <EnquiryDetailDrawer
          enquiry={selectedEnquiry}
          onClose={() => setSelectedEnquiry(null)}
          onUpdated={() => { setSelectedEnquiry(null); fetchEnquiries(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Enquiry"
        message="This action cannot be undone. Are you sure you want to delete this enquiry?"
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Enquiries;
