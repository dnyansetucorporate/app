import React, { useState } from 'react';
import { X, Loader2, Plus, ClipboardList } from 'lucide-react';
import DateInput from '@/components/DateInput';
import { enquiryService } from '@/services/enquiry.service';
import { formatCalendarDate } from '@/utils/date';
import toast from '@/utils/toastWrapper';

interface FollowUp {
  id: string;
  date: string;
  note: string;
}

interface EnquiryDetailDrawerProps {
  enquiry: any;
  onClose: () => void;
  /** Called after a successful save or follow-up add so the parent list can refresh. */
  onUpdated: () => void;
}

const inputClass = 'w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA]';
const labelClass = 'text-[14px] font-semibold text-[#1A2332]';

export const EnquiryDetailDrawer: React.FC<EnquiryDetailDrawerProps> = ({ enquiry, onClose, onUpdated }) => {
  const toYMD = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

  const [formData, setFormData] = useState({
    name: enquiry.name || '',
    contactNo: enquiry.contactNo || '',
    source: enquiry.source || '',
    courseEnrolledFor: enquiry.courseEnrolledFor || '',
    enquiryDate: toYMD(enquiry.enquiryDate),
    address: enquiry.address || '',
    education: enquiry.education || '',
    dob: toYMD(enquiry.dob),
    feeStructure: enquiry.feeStructure || '',
    remark: enquiry.remark || '',
    admissionTaken: Boolean(enquiry.admissionTaken),
    admissionDate: toYMD(enquiry.admissionDate),
    joiningDate: toYMD(enquiry.joiningDate),
    courseTime: enquiry.courseTime || '',
  });
  const [saving, setSaving] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>(enquiry.followUps || []);
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [addingFollowUp, setAddingFollowUp] = useState(false);

  const set = (field: string, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.contactNo.trim() || !formData.enquiryDate) {
      toast.error('Name, contact number and enquiry date are required');
      return;
    }
    setSaving(true);
    try {
      await enquiryService.update(enquiry.id, {
        ...formData,
        ...(formData.admissionTaken ? {} : { admissionDate: '', joiningDate: '', courseTime: '' }),
      });
      toast.success('Enquiry updated');
      onUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update enquiry');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFollowUp = async () => {
    if (!newFollowUpDate || !newFollowUpNote.trim()) {
      toast.error('Follow-up date and note are required');
      return;
    }
    setAddingFollowUp(true);
    try {
      const res: any = await enquiryService.addFollowUp(enquiry.id, { date: newFollowUpDate, note: newFollowUpNote.trim() });
      setFollowUps((prev) => [res.data, ...prev]);
      setNewFollowUpDate('');
      setNewFollowUpNote('');
      toast.success('Follow-up added');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add follow-up');
    } finally {
      setAddingFollowUp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="bg-white w-full max-w-xl h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-[#E2E8F0] sticky top-0 z-10">
          <h3 className="font-semibold text-[18px] text-[#1A2332]">Enquiry Details</h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#1A2332] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Name</label>
              <input value={formData.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Contact No.</label>
              <input value={formData.contactNo} onChange={(e) => set('contactNo', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Enquiry Date</label>
              <DateInput value={formData.enquiryDate} onChange={(v) => set('enquiryDate', v)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>How You Know About Dnyansetu</label>
              <input value={formData.source} onChange={(e) => set('source', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Course Enrolled For</label>
              <input value={formData.courseEnrolledFor} onChange={(e) => set('courseEnrolledFor', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Education</label>
              <input value={formData.education} onChange={(e) => set('education', e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Date of Birth</label>
              <DateInput value={formData.dob} onChange={(v) => set('dob', v)} max={new Date().toISOString().split('T')[0]} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Address</label>
              <input value={formData.address} onChange={(e) => set('address', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Fee Structure</label>
            <textarea value={formData.feeStructure} onChange={(e) => set('feeStructure', e.target.value)} rows={3} className={`${inputClass} h-auto py-3 resize-none`} />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Remark</label>
            <textarea value={formData.remark} onChange={(e) => set('remark', e.target.value)} rows={2} className={`${inputClass} h-auto py-3 resize-none`} />
          </div>

          {/* Admission */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Admission Date</label>
                  <DateInput value={formData.admissionDate} onChange={(v) => set('admissionDate', v)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Joining Date</label>
                  <DateInput value={formData.joiningDate} onChange={(v) => set('joiningDate', v)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelClass}>Course Time</label>
                  <input value={formData.courseTime} onChange={(e) => set('courseTime', e.target.value)} placeholder="e.g. 10:00 AM - 12:00 PM" className={inputClass} />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="h-11 bg-[#C8102E] text-white rounded-[4px] text-[14px] font-medium hover:bg-red-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>

          {/* Follow-ups */}
          <div className="flex flex-col gap-3 pt-2 border-t border-[#E2E8F0] mt-2">
            <h4 className="text-[15px] font-semibold text-[#1A2332] flex items-center gap-2 pt-4">
              <ClipboardList size={16} className="text-[#4DB8CA]" />
              Follow Ups
            </h4>

            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
              <div className="flex flex-col gap-1.5 w-full sm:w-40">
                <label className="text-[12px] text-[#64748B]">Date</label>
                <DateInput value={newFollowUpDate} onChange={setNewFollowUpDate} className="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-md text-[13px] text-[#1A2332] outline-none focus:border-[#4DB8CA]" />
              </div>
              <div className="flex flex-col gap-1.5 flex-1 w-full">
                <label className="text-[12px] text-[#64748B]">Follow Up Note</label>
                <input
                  value={newFollowUpNote}
                  onChange={(e) => setNewFollowUpNote(e.target.value)}
                  placeholder="e.g. Called, will visit next week"
                  className="w-full h-10 px-3 bg-white border border-[#E2E8F0] rounded-md text-[13px] text-[#1A2332] outline-none focus:border-[#4DB8CA]"
                />
              </div>
              <button
                onClick={handleAddFollowUp}
                disabled={addingFollowUp}
                className="h-10 px-4 flex items-center gap-1.5 bg-[#0A3D4D] text-white rounded-md text-[13px] font-medium hover:bg-[#0A3D4D]/90 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {addingFollowUp ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add
              </button>
            </div>

            {followUps.length > 0 ? (
              <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden mt-1">
                <table className="w-full text-[13px]">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[#64748B] font-medium w-32">Date</th>
                      <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Follow Up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {followUps.map((f) => (
                      <tr key={f.id}>
                        <td className="px-4 py-2.5 text-[#64748B] whitespace-nowrap">{formatCalendarDate(f.date)}</td>
                        <td className="px-4 py-2.5 text-[#1A2332]">{f.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-[#94A3B8]">No follow-ups recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnquiryDetailDrawer;
