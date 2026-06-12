import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { ImageIcon, CheckCircle2, Download, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { branchService } from '@/services/branch.service';
import toast from '@/utils/toastWrapper';
import { validateImageFile, createPreviewUrl } from '@/utils/imageUtils';
import { downloadAsPng, branchCertificateHtml } from '@/utils/branchCertificate';

const indianPhoneRegex = /^[6-9]\d{9}$/;
const aadharRegex = /^\d{12}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const BranchSchema = Yup.object().shape({
  name: Yup.string()
    .required('Branch name is required')
    .min(3, 'Branch name must be at least 3 characters'),
  adminName: Yup.string()
    .required('Admin name is required')
    .min(2, 'Admin name must be at least 2 characters'),
  adminDob: Yup.string().optional(),
  phone1: Yup.string()
    .required('Phone number is required')
    .matches(indianPhoneRegex, 'Must be a valid Indian mobile number (10 digits, starting with 6-9)'),
  phone2: Yup.string()
    .optional()
    .test('phone2-format', 'Must be a valid Indian mobile number (10 digits, starting with 6-9)', (val) =>
      !val || indianPhoneRegex.test(val)
    ),
  adminEmail: Yup.string().email('Invalid email address').required('Email is required'),
  adminPassword: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(passwordRegex, 'Must contain uppercase, lowercase, number, and special character (@$!%*?&)'),
  address: Yup.string()
    .required('Address is required')
    .min(5, 'Address must be at least 5 characters'),
  location: Yup.string()
    .required('Location is required')
    .min(2, 'Location must be at least 2 characters'),
  aadharNo: Yup.string()
    .optional()
    .test('aadhar-format', 'Aadhar number must be 12 digits', (val) =>
      !val || aadharRegex.test(val)
    ),
  panNo: Yup.string()
    .optional()
    .test('pan-format', 'PAN must be in format: AAAAA0000A', (val) =>
      !val || panRegex.test(val)
    ),
});

function ImageUploadBox({
  file,
  previewUrl,
  inputRef,
  onChange,
  isPhoto = false,
}: {
  file: File | null;
  previewUrl: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (f: File | null) => void;
  isPhoto?: boolean;
}) {
  const handleZoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.click();
  };

  const handleViewImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!previewUrl) return;
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      {file && previewUrl ? (
        isPhoto ? (
          /* ── Photo (avatar) uploaded state ── */
          <div className="w-full rounded-xl border border-[#E2E8F0] bg-white py-6 flex flex-col items-center gap-3 shadow-sm">
            <div className="relative">
              <img src={previewUrl} alt="preview" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-[#E2E8F0]" />
              <span className="absolute bottom-0 right-0 w-6 h-6 bg-[#4DB8CA] rounded-full flex items-center justify-center border-2 border-white">
                <ImageIcon size={12} className="text-white" />
              </span>
            </div>
            <p className="text-[13px] font-medium text-[#1A2332] max-w-[180px] truncate">{file.name}</p>
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
            <img src={previewUrl} alt="preview" className="w-[130px] h-[72px] object-cover rounded-md border border-[#D0DCE4] flex-shrink-0" />
            <button type="button" onClick={handleViewImage} className="flex-1 text-center text-[15px] text-[#4B5563] font-medium hover:text-[#1F2937] transition-colors">
              View Image
            </button>
            <button type="button" onClick={handleZoneClick} className="flex-shrink-0 h-10 px-5 rounded-xl border border-[#1F2937] bg-white text-[#111827] text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-[#F8FAFC] transition-colors">
              <RotateCcw size={16} />
              Replace
            </button>
          </div>
        )
      ) : (
        <div
          onClick={handleZoneClick}
          className="border-2 border-dashed border-[#E2E8F0] rounded-md h-[120px] flex flex-col items-center justify-center bg-[#F8FAFC] hover:bg-gray-100 transition-colors cursor-pointer group"
        >
          <ImageIcon size={24} className="text-[#64748B] mb-2 group-hover:text-[#4DB8CA] transition-colors" />
          <p className="text-[14px]">
            <span className="text-[#4DB8CA] font-semibold">Click to upload</span>
            <span className="text-[#64748B]"> or drag and drop</span>
          </p>
          <p className="text-[12px] text-[#64748B] mt-1">JPG, JPEG, PNG, JFIF less than 1MB</p>
        </div>
      )}
    </>
  );
}

const FormField = ({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="block text-[14px] font-semibold text-[#1A2332]">
      {label}
      {required && <span className="text-[#C8102E] ml-1">*</span>}
    </label>
    {children}
  </div>
);

const AddBranch: React.FC = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdBranch, setCreatedBranch] = useState<any | null>(null);
  const { setPageHeader } = usePageHeader();

  // Admin photo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  // Aadhar card image
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [aadharPreview, setAadharPreview] = useState<string | null>(null);
  const aadharInputRef = React.useRef<HTMLInputElement | null>(null);

  // PAN card image
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const panInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = (
    f: File | null,
    setFile: (v: File | null) => void,
    setPreview: (v: string | null) => void
  ) => {
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }

    // Validate file
    const error = validateImageFile(f);
    if (error) {
      toast.error(error);
      return;
    }

    setFile(f);
    setPreview(createPreviewUrl(f));
  };

  useEffect(() => {
    setPageHeader(
      'Add New Branch',
      'Register a new branch and assign an admin',
      <button type="submit" form="add-branch-form" className="flex items-center gap-2 px-6 py-2.5 bg-white border border-[#E2E8F0] text-[#1A2332] rounded-[6px] text-[14px] font-medium hover:bg-gray-50 transition-colors">
        <Plus size={18} className="text-[#1A2332]" />
        Add New Branch
      </button>
    );
  }, [setPageHeader]);

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    try {
      let payload: any;
      const hasFiles = logoFile || aadharFile || panFile;
      if (hasFiles) {
        const fd = new FormData();
        fd.append('name', values.name);
        fd.append('adminName', values.adminName);
        fd.append('adminEmail', values.adminEmail);
        fd.append('adminPassword', values.adminPassword);
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
          adminEmail: values.adminEmail,
          adminPassword: values.adminPassword,
          phone1: values.phone1,
          ...(values.phone2 ? { phone2: values.phone2 } : {}),
          address: values.address,
          location: values.location,
          ...(values.adminDob ? { adminDob: values.adminDob } : {}),
          ...(values.aadharNo ? { aadharNo: values.aadharNo } : {}),
          ...(values.panNo ? { panNo: values.panNo } : {}),
        };
      }
      const res: any = await branchService.create(payload);
      setCreatedBranch(res.data || res);
      setShowSuccess(true);
      resetForm();
      setLogoFile(null);
      setLogoPreview(null);
      setAadharFile(null);
      setAadharPreview(null);
      setPanFile(null);
      setPanPreview(null);
      toast.success('Branch created successfully');
    } catch (err: any) {
      console.error('Failed to create branch', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to create branch';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <Formik
          initialValues={{
            name: '',
            adminName: '',
            adminDob: '',
            phone1: '',
            phone2: '',
            adminEmail: '',
            adminPassword: '',
            address: '',
            location: '',
            aadharNo: '',
            panNo: '',
          }}
          validationSchema={BranchSchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched }) => (
            <Form id="add-branch-form" className="flex flex-col">
              
              <div className="p-8 space-y-8">
                {/* Admin photo upload */}
                <div>
                  <label className="block text-[14px] font-semibold text-[#1A2332] mb-3">
                    Upload Admin Photo <span className="text-[#C8102E]">*</span>
                  </label>
                  <ImageUploadBox
                    file={logoFile}
                    previewUrl={logoPreview}
                    inputRef={logoInputRef as React.RefObject<HTMLInputElement>}
                    onChange={(f) => handleFileChange(f, setLogoFile, setLogoPreview)}
                    isPhoto
                  />
                </div>

                {/* Branch Name - full width */}
                <FormField label="Branch Name" required>
                  <Field
                    name="name"
                    placeholder="Enter branch name"
                    className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.name && touched.name && 'border-[#C8102E]')}
                  />
                  <ErrorMessage name="name" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                </FormField>

                {/* Two-column grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <FormField label="Admin Name" required>
                    <Field
                      name="adminName"
                      placeholder="Enter admin name"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.adminName && touched.adminName && 'border-[#C8102E]')}
                    />
                    <ErrorMessage name="adminName" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Date of Birth" required>
                    <Field
                      name="adminDob"
                      type="date"
                      placeholder="Enter admin DOB"
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none focus:border-[#4DB8CA]"
                    />
                    <ErrorMessage name="adminDob" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Phone Number 1" required>
                    <Field
                      name="phone1"
                      placeholder="Enter admin phone number 1"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.phone1 && touched.phone1 && 'border-[#C8102E]')}
                    />
                    <ErrorMessage name="phone1" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Phone Number 2" required>
                    <Field
                      name="phone2"
                      placeholder="Enter admin phone number 2"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", (errors as any).phone2 && (touched as any).phone2 && 'border-[#C8102E]')}
                    />
                    <ErrorMessage name="phone2" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Email Address" required>
                    <Field
                      name="adminEmail"
                      type="email"
                      placeholder="Enter email address"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", (errors as any).adminEmail && (touched as any).adminEmail && 'border-[#C8102E]')}
                    />
                    <ErrorMessage name="adminEmail" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Password" required>
                    <Field
                      name="adminPassword"
                      type="password"
                      placeholder="Enter admin password"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", (errors as any).adminPassword && (touched as any).adminPassword && 'border-[#C8102E]')}
                    />
                    <ErrorMessage name="adminPassword" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Branch Address" required>
                    <Field
                      name="address"
                      placeholder="Enter branch address"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.address && touched.address && 'border-[#C8102E]')}
                    />
                    <ErrorMessage name="address" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  <FormField label="Location" required>
                    <Field
                      name="location"
                      placeholder="Enter branch location"
                      className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.location && touched.location && 'border-[#C8102E]')}
                    />
                    <ErrorMessage name="location" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                  </FormField>

                  {/* Aadhar */}
                  <div className="space-y-3 border border-[#E2E8F0] rounded-[8px] p-6">
                    <FormField label="Aadhar Card Number" required>
                      <Field
                        name="aadharNo"
                        placeholder="Enter aadhar card number"
                        className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.aadharNo && touched.aadharNo && 'border-[#C8102E]')}
                      />
                      <ErrorMessage name="aadharNo" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                    </FormField>
                    <div className="mt-4">
                      <ImageUploadBox
                        file={aadharFile}
                        previewUrl={aadharPreview}
                        inputRef={aadharInputRef as React.RefObject<HTMLInputElement>}
                        onChange={(f) => handleFileChange(f, setAadharFile, setAadharPreview)}
                      />
                    </div>
                  </div>

                  {/* PAN */}
                  <div className="space-y-3 border border-[#E2E8F0] rounded-[8px] p-6">
                    <FormField label="PAN Card Number" required>
                      <Field
                        name="panNo"
                        placeholder="Enter PAN card number"
                        className={cn("w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-md text-[15px] font-medium text-[#1A2332] outline-none placeholder:text-[#94A3B8] focus:border-[#4DB8CA]", errors.panNo && touched.panNo && 'border-[#C8102E]')}
                      />
                      <ErrorMessage name="panNo" component="p" className="text-[#C8102E] text-[12px] mt-1" />
                    </FormField>
                    <div className="mt-4">
                      <ImageUploadBox
                        file={panFile}
                        previewUrl={panPreview}
                        inputRef={panInputRef as React.RefObject<HTMLInputElement>}
                        onChange={(f) => handleFileChange(f, setPanFile, setPanPreview)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
                <div className="flex items-center justify-end gap-6 px-8 py-6 border-t border-[#E2E8F0] bg-white">
                <button type="button" className="text-[14px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-[#C8102E] text-white rounded-md text-[15px] font-medium hover:bg-red-800 transition-colors shadow-sm">
                  <Plus size={18} />
                  Add Branch
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] w-full max-w-md shadow-2xl p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-[#E5F7ED] flex items-center justify-center text-[#0BB783] mb-6 shadow-[0_0_0_6px_#F2FCF6]">
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>
            <h2 className="text-[20px] font-bold text-[#1A2332] leading-snug mb-2 whitespace-pre-line">
              {createdBranch?.name ? `"${createdBranch.name}"\nHas Been Successfully Created!` : 'Branch Has Been\nSuccessfully Created!'}
            </h2>
            <p className="text-[14px] text-[#64748B] mt-2 mb-8 max-w-xs">
              The branch is ready. You can now manage students and courses.
            </p>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={async () => {
                  try {
                    toast.info?.('Generating certificate…');
                    await downloadAsPng(
                      branchCertificateHtml(createdBranch),
                      `authority-certificate-${(createdBranch?.name || 'branch').replace(/\s+/g, '-')}.png`
                    );
                  } catch {
                    toast.error('Failed to generate certificate');
                  }
                }}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[#C8102E] text-white rounded-md font-medium text-[15px] hover:bg-red-800 transition-colors"
              >
                <Download size={20} />
                Download Certificate
              </button>
              <button
                onClick={() => { setShowSuccess(false); setCreatedBranch(null); }}
                className="text-[15px] text-[#64748B] font-medium hover:text-[#1A2332] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddBranch;