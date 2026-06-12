import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { ImageIcon, CheckCircle2, ArrowLeft, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { branchService } from '@/services/branch.service';
import toast from '@/utils/toastWrapper';
import { validateImageFile, createPreviewUrl } from '@/utils/imageUtils';
import { useParams, useNavigate } from 'react-router-dom';

const BACKEND_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
const getImageUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BACKEND_ROOT}/${path.replace(/^\//, '')}`;
};

const indianPhoneRegex = /^[6-9]\d{9}$/;
const aadharRegex = /^\d{12}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const EditBranchSchema = Yup.object().shape({
  name: Yup.string().required('Branch name is required').min(3, 'At least 3 characters'),
  adminName: Yup.string().required('Admin name is required').min(2, 'At least 2 characters'),
  adminDob: Yup.string().optional(),
  phone1: Yup.string().required('Phone number is required').matches(indianPhoneRegex, 'Valid Indian mobile number required'),
  phone2: Yup.string().optional().test('phone2', 'Valid Indian mobile number required', (v) => !v || indianPhoneRegex.test(v)),
  address: Yup.string().required('Address is required').min(5, 'At least 5 characters'),
  location: Yup.string().required('Location is required').min(2, 'At least 2 characters'),
  aadharNo: Yup.string().optional().test('aadhar', 'Aadhar must be 12 digits', (v) => !v || aadharRegex.test(v)),
  panNo: Yup.string().optional().test('pan', 'PAN must be in format: AAAAA0000A', (v) => !v || panRegex.test(v)),
});

function ImageUploadBox({
  file,
  previewUrl,
  existingUrl,
  inputRef,
  onChange,
  isPhoto = false,
}: {
  file: File | null;
  previewUrl: string | null;
  existingUrl?: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (f: File | null) => void;
  isPhoto?: boolean;
}) {
  const handleZoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.click();
  };

  const displayUrl = previewUrl || existingUrl || null;

  const handleViewImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!displayUrl) return;
    window.open(displayUrl, '_blank', 'noopener,noreferrer');
  };

  if (displayUrl) {
    return (
      <>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
        {isPhoto ? (
          /* ── Photo (avatar) uploaded state ── */
          <div className="w-full rounded-xl border border-[#E2E8F0] bg-white py-6 flex flex-col items-center gap-3 shadow-sm">
            <div className="relative">
              <img src={displayUrl} alt="preview" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-[#E2E8F0]" />
              <span className="absolute bottom-0 right-0 w-6 h-6 bg-[#4DB8CA] rounded-full flex items-center justify-center border-2 border-white">
                <ImageIcon size={12} className="text-white" />
              </span>
            </div>
            {file && <p className="text-[13px] font-medium text-[#1A2332] max-w-[180px] truncate">{file.name}</p>}
            <div className="flex items-center gap-3 mt-1">
              <button type="button" onClick={handleViewImage} className="text-[13px] font-medium text-[#4DB8CA] hover:underline transition-colors">
                View Photo
              </button>
              <span className="w-px h-4 bg-[#E2E8F0]" />
              <button type="button" onClick={handleZoneClick} className="h-8 px-4 rounded-lg border border-[#1F2937] bg-white text-[#111827] text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#F8FAFC] transition-colors">
                <RotateCcw size={13} />
                Replace
              </button>
            </div>
          </div>
        ) : (
          /* ── Document uploaded state ── */
          <div className="w-full rounded-md border border-[#D8E8DE] bg-[#EDF5F0] p-3 flex items-center gap-4">
            <img src={displayUrl} alt="preview" className="w-[130px] h-[72px] object-cover rounded-md border border-[#D0DCE4] flex-shrink-0" />
            <button type="button" onClick={handleViewImage} className="flex-1 text-center text-[15px] text-[#4B5563] font-medium hover:text-[#1F2937] transition-colors">
              View Image
            </button>
            <button type="button" onClick={handleZoneClick} className="flex-shrink-0 h-10 px-5 rounded-xl border border-[#1F2937] bg-white text-[#111827] text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-[#F8FAFC] transition-colors">
              <RotateCcw size={16} />
              Replace
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <div onClick={handleZoneClick} className="border-2 border-dashed border-[#E2E8F0] rounded-md h-[120px] flex flex-col items-center justify-center bg-[#F8FAFC] hover:bg-gray-100 transition-colors cursor-pointer group">
        <ImageIcon size={24} className="text-[#64748B] mb-2 group-hover:text-[#4DB8CA]" />
        <p className="text-[14px]"><span className="text-[#4DB8CA] font-semibold">Click to upload</span><span className="text-[#64748B]"> or drag and drop</span></p>
        <p className="text-[12px] text-[#64748B] mt-1">JPG, JPEG, PNG, JFIF less than 1MB</p>
      </div>
    </>
  );
}

const FormField = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="block text-[14px] font-semibold text-[#1A2332]">
      {label}{required && <span className="text-[#C8102E] ml-1">*</span>}
    </label>
    {children}
  </div>
);

const EditBranch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const [branchData, setBranchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [aadharPreview, setAadharPreview] = useState<string | null>(null);
  const aadharInputRef = React.useRef<HTMLInputElement | null>(null);

  const [panFile, setPanFile] = useState<File | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const panInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPageHeader('Edit Branch Details', 'Update branch information.', undefined, true);
    if (!id) return;
    branchService.getById(id).then((res: any) => {
      setBranchData(res.data ?? res);
    }).catch(() => {
      toast.error('Failed to load branch');
    }).finally(() => setLoading(false));
  }, [id, setPageHeader]);

  const handleFileChange = (f: File | null, setFile: (v: File | null) => void, setPreview: (v: string | null) => void) => {
    if (!f) { setFile(null); setPreview(null); return; }
    const error = validateImageFile(f);
    if (error) { toast.error(error); return; }
    setFile(f);
    setPreview(createPreviewUrl(f));
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const hasFiles = logoFile || aadharFile || panFile;
      let payload: any;
      if (hasFiles) {
        const fd = new FormData();
        fd.append('name', values.name);
        fd.append('adminName', values.adminName);
        fd.append('phone1', values.phone1);
        if (values.phone2) fd.append('phone2', values.phone2);
        fd.append('address', values.address);
        fd.append('location', values.location);
        if (values.adminDob) fd.append('adminDob', values.adminDob);
        if (values.aadharNo) fd.append('aadharNo', values.aadharNo);
        if (values.panNo) fd.append('panNo', values.panNo);
        if (logoFile) fd.append('logo', logoFile);
        if (aadharFile) fd.append('aadharImage', aadharFile);
        if (panFile) fd.append('panImage', panFile);
        payload = fd;
      } else {
        payload = {
          name: values.name,
          adminName: values.adminName,
          phone1: values.phone1,
          ...(values.phone2 ? { phone2: values.phone2 } : {}),
          address: values.address,
          location: values.location,
          ...(values.adminDob ? { adminDob: values.adminDob } : {}),
          ...(values.aadharNo ? { aadharNo: values.aadharNo } : {}),
          ...(values.panNo ? { panNo: values.panNo } : {}),
        };
      }

      // Use FormData-aware update
      if (payload instanceof FormData) {
        await branchService.updateWithFiles(id!, payload);
      } else {
        await branchService.update(id!, payload);
      }

      toast.success('Branch updated successfully');
      setShowSuccess(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update branch');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Loading branch...</div>;
  if (!branchData) return null;

  const initialValues = {
    name: branchData.name || '',
    adminName: branchData.admin?.name || '',
    adminDob: branchData.adminDob || '',
    phone1: branchData.phone1 || '',
    phone2: branchData.phone2 || '',
    address: branchData.address || '',
    location: branchData.location || '',
    aadharNo: branchData.aadharNo || '',
    panNo: branchData.panNo || '',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <Formik initialValues={initialValues} validationSchema={EditBranchSchema} onSubmit={handleSubmit} enableReinitialize>
          {({ errors, touched }) => (
            <Form id="edit-branch-form" className="flex flex-col">
              <div className="p-8 space-y-8">
                {/* Admin photo */}
                <div>
                  <label className="block text-[14px] font-semibold text-[#1A2332] mb-3">Admin Photo / Branch Logo</label>
                  <ImageUploadBox
                    file={logoFile} previewUrl={logoPreview}
                    existingUrl={getImageUrl(branchData.logo)}
                    inputRef={logoInputRef as React.RefObject<HTMLInputElement>}
                    onChange={(f) => handleFileChange(f, setLogoFile, setLogoPreview)}
                    isPhoto
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <FormField label="Branch ID">
                    <input type="text" value={branchData.branchCode || '—'} disabled className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[15px] text-[#64748B] cursor-not-allowed" />
                  </FormField>

                  <FormField label="Branch Name" required>
                    <Field name="name" placeholder="Enter branch name"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.name && touched.name && 'border-[#C8102E]')} />
                    <ErrorMessage name="name" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Admin Name" required>
                    <Field name="adminName" placeholder="Enter admin name"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.adminName && touched.adminName && 'border-[#C8102E]')} />
                    <ErrorMessage name="adminName" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Date of Birth">
                    <Field name="adminDob" type="date" max={new Date().toISOString().split('T')[0]} className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none focus:border-[#4DB8CA]" />
                  </FormField>

                  <FormField label="Phone Number 1" required>
                    <Field name="phone1" placeholder="Enter phone number"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.phone1 && touched.phone1 && 'border-[#C8102E]')} />
                    <ErrorMessage name="phone1" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Phone Number 2">
                    <Field name="phone2" placeholder="Enter phone number 2"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", (errors as any).phone2 && (touched as any).phone2 && 'border-[#C8102E]')} />
                    <ErrorMessage name="phone2" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Email Address">
                    <input type="email" value={branchData.admin?.email || ''} disabled
                      className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[15px] text-[#64748B] cursor-not-allowed" />
                    <p className="text-[12px] text-[#94A3B8] mt-1">Email cannot be changed</p>
                  </FormField>

                  <FormField label="Password">
                    <input type="password" value="••••••••" disabled
                      className="w-full h-12 px-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-[15px] text-[#64748B] cursor-not-allowed" />
                    <p className="text-[12px] text-[#94A3B8] mt-1">Password cannot be changed here</p>
                  </FormField>

                  <FormField label="Branch Address" required>
                    <Field name="address" placeholder="Enter branch address"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.address && touched.address && 'border-[#C8102E]')} />
                    <ErrorMessage name="address" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Location" required>
                    <Field name="location" placeholder="Enter location"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.location && touched.location && 'border-[#C8102E]')} />
                    <ErrorMessage name="location" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  {/* Aadhar */}
                  <div className="space-y-3 border border-[#E2E8F0] rounded-[8px] p-6">
                    <FormField label="Aadhar Card Number">
                      <Field name="aadharNo" placeholder="Enter 12-digit aadhar number"
                        className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.aadharNo && touched.aadharNo && 'border-[#C8102E]')} />
                      <ErrorMessage name="aadharNo" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                    </FormField>
                    <div className="mt-4">
                      <ImageUploadBox
                        file={aadharFile} previewUrl={aadharPreview}
                        existingUrl={getImageUrl(branchData.aadharImage)}
                        inputRef={aadharInputRef as React.RefObject<HTMLInputElement>}
                        onChange={(f) => handleFileChange(f, setAadharFile, setAadharPreview)}
                      />
                    </div>
                  </div>

                  {/* PAN */}
                  <div className="space-y-3 border border-[#E2E8F0] rounded-[8px] p-6">
                    <FormField label="PAN Card Number">
                      <Field name="panNo" placeholder="Enter PAN number"
                        className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.panNo && touched.panNo && 'border-[#C8102E]')} />
                      <ErrorMessage name="panNo" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                    </FormField>
                    <div className="mt-4">
                      <ImageUploadBox
                        file={panFile} previewUrl={panPreview}
                        existingUrl={getImageUrl(branchData.panImage)}
                        inputRef={panInputRef as React.RefObject<HTMLInputElement>}
                        onChange={(f) => handleFileChange(f, setPanFile, setPanPreview)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-6 px-8 py-6 border-t border-[#E2E8F0] bg-white">
                <button type="button" onClick={() => navigate('/super-admin/branches')}
                  className="flex items-center gap-2 text-[14px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors">
                  <ArrowLeft size={16} /> Back to Branches
                </button>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => navigate('/super-admin/branches')}
                    className="text-[14px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-[#C8102E] text-white rounded-md text-[15px] font-medium hover:bg-red-800 transition-colors shadow-sm">
                    + Update Branch Details
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="bg-white rounded-[16px] w-full max-w-md shadow-2xl p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#E5F7ED] flex items-center justify-center text-[#0BB783] mb-6 shadow-[0_0_0_6px_#F2FCF6]">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>
            <h2 className="text-[20px] font-bold text-[#1A2332] mb-2">Branch Updated</h2>
            <p className="text-[14px] text-[#64748B] mb-6">The branch details have been saved successfully.</p>
            <div className="flex gap-3">
              <button onClick={() => navigate('/super-admin/branches')}
                className="px-6 py-2.5 bg-[#C8102E] text-white rounded-md font-medium text-[14px] hover:bg-red-800 transition-colors">
                Back to Branches
              </button>
              <button onClick={() => setShowSuccess(false)}
                className="px-6 py-2.5 border border-[#E2E8F0] text-[#64748B] rounded-md font-medium text-[14px] hover:bg-gray-50 transition-colors">
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditBranch;
