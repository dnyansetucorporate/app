import React, { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, Image as ImageIcon, Loader2, CheckCircle2, Clock, RotateCcw, Printer } from 'lucide-react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import toast from '@/utils/toastWrapper';
import { buildImageUrl, validateImageFile, createPreviewUrl } from '@/utils/imageUtils';
import { courseService } from '@/services/course.service';
import { studentService } from '@/services/student.service';
import { paymentService } from '@/services/payment.service';
import { branchService } from '@/services/branch.service';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';

const AddStudent: React.FC = () => {
  const { setPageHeader } = usePageHeader();
  const { user } = useAuth();
  const { id: editId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(editId);

  const [loading, setLoading] = useState(false);
  const [fetchingStudent, setFetchingStudent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [enrollment, setEnrollment] = useState<{
    id: string;
    courseFee: number;
    paymentStatus: string;
    payments: Array<{ id: string; feeTaken: number; paidAt: string | null; createdAt: string; nextInstallmentDate?: string | null }>;
  } | null>(null);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [paymentAmountError, setPaymentAmountError] = useState('');
  const [branchInfo, setBranchInfo] = useState<{ name: string; address: string; location: string; phone1: string; adminEmail: string } | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    courseId: '',
    branchId: '',
    totalFees: '',
    paidFees: '',
    nextInstallmentDate: '',
  });

  // ── Fetch courses on mount ──
  useEffect(() => {
    fetchCourses();
  }, []);

  // ── Fetch branch info for invoice footer ──
  useEffect(() => {
    const bid = formData.branchId || user?.branchId;
    if (!bid) return;
    branchService.getById(bid).then((res: any) => {
      const b = res?.data || res;
      setBranchInfo({
        name: b?.name || '',
        address: b?.address || '',
        location: b?.location || '',
        phone1: b?.phone1 || '',
        adminEmail: b?.admin?.email || b?.adminEmail || '',
      });
    }).catch(() => {});
  }, [formData.branchId, user?.branchId]);

  // ── Set page header & fetch student in edit mode ──
  useEffect(() => {
    if (isEditMode) {
      setPageHeader(
        'Edit Student Details',
        'Update student information.',
        undefined,
        false
      );
      fetchStudentForEdit();
    } else {
      setPageHeader(
        'Add New Students',
        'Add and manage student details easily.',
        (
          <button className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] rounded-[4px] bg-transparent text-[14px] text-[#1A2332] hover:bg-gray-50 transition-colors">
            <Plus size={16} />
            Add New Students
          </button>
        ),
        false
      );
    }
  }, [isEditMode, editId, setPageHeader]);

  const fetchStudentForEdit = async () => {
    if (!editId) return;
    setFetchingStudent(true);
    try {
      const res: any = await studentService.getById(editId);
      const s = res?.data || res;
      setFormData({
        firstName: s.firstName || '',
        middleName: s.middleName || '',
        lastName: s.lastName || '',
        email: s.email || '',
        phone: s.phone || '',
        address: s.address || '',
        dob: s.dob ? new Date(s.dob).toISOString().split('T')[0] : '',
        courseId: s.enrollments?.[0]?.courseId || s.enrollments?.[0]?.course?.id || '',
        branchId: s.branchId || '',
        totalFees: s.enrollments?.[0]?.totalFees?.toString() || '',
        paidFees: s.enrollments?.[0]?.paidFees?.toString() || '',
        nextInstallmentDate: '',
      });
      // Populate enrollment state
      const enr = s.enrollments?.[0];
      if (enr) {
        setEnrollment({
          id: enr.id,
          courseFee: Number(enr.courseFee),
          paymentStatus: enr.paymentStatus,
          payments: (enr.payments || []).map((p: any) => ({
            id: p.id,
            feeTaken: Number(p.feeTaken),
            paidAt: p.paidAt,
            createdAt: p.createdAt,
            nextInstallmentDate: p.nextInstallmentDate || null,
          })),
        });
      }
      // If student has a stored photo URL, show it as preview
      if (s.photo) {
        setPhotoPreview(buildImageUrl(s.photo));
      }
    } catch (err) {
      console.error('Failed to fetch student', err);
      toast.error('Could not load student details');
    } finally {
      setFetchingStudent(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res: any = await courseService.list({ limit: 100 });
      setCourses(res.data || res.courses || []);
    } catch (err) {
      console.error('Failed to fetch courses', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validateFields();
    setErrors(fieldErrors);
  };

  const validateFields = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const indianPhone = /^[6-9]\d{9}$/;
    const branchIdToUse = user?.branchId || formData.branchId;

    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    else if (formData.firstName.trim().length < 2) errs.firstName = 'First name must be at least 2 characters';

    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    else if (formData.lastName.trim().length < 2) errs.lastName = 'Last name must be at least 2 characters';

    if (!formData.email.trim()) errs.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email address';

    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    else if (!indianPhone.test(formData.phone.trim())) errs.phone = 'Must be a valid Indian mobile number (10 digits, starting with 6–9)';

    if (!formData.address.trim()) errs.address = 'Address is required';
    else if (formData.address.trim().length < 5) errs.address = 'Address must be at least 5 characters';


    if (!isEditMode && !branchIdToUse) errs.branchId = 'Branch is required';

    if (!isEditMode && !formData.courseId) errs.courseId = 'Please select a course';

    if (!isEditMode && formData.courseId) {
      if (!formData.totalFees) errs.totalFees = 'Total course fee is required';
      else if (isNaN(Number(formData.totalFees)) || Number(formData.totalFees) <= 0) errs.totalFees = 'Enter a valid fee amount';

      if (formData.paidFees) {
        if (isNaN(Number(formData.paidFees)) || Number(formData.paidFees) < 0) errs.paidFees = 'Enter a valid paid amount';
        else if (Number(formData.paidFees) > Number(formData.totalFees)) errs.paidFees = 'Paid amount cannot exceed total fee';
      }

      const hasRemainingBalance =
        Number(formData.totalFees) > 0 &&
        Number(formData.paidFees) < Number(formData.totalFees);
      if (hasRemainingBalance && !formData.nextInstallmentDate) {
        errs.nextInstallmentDate = 'Next installment date is required when fees are not fully paid';
      }
    }

    return errs;
  };

  const validateAndSetPhoto = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    // Validate file
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(createPreviewUrl(file));
  };

  const handleViewPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!photoPreview) return;
    window.open(photoPreview, '_blank', 'noopener,noreferrer');
  };

  const handlePrintReceipt = (payment: { id: string; feeTaken: number; paidAt: string | null; createdAt: string; nextInstallmentDate?: string | null }) => {
    const receiptWindow = window.open('', '_blank', 'width=860,height=1100');
    if (!receiptWindow) {
      toast.error('Unable to open print window. Please allow popups for this site.');
      return;
    }

    const origin = window.location.origin;
    const totalFee = Number(enrollment?.courseFee || 0);
    const sortedPayments = [...(enrollment?.payments || [])].sort(
      (a, b) => new Date(a.paidAt || a.createdAt).getTime() - new Date(b.paidAt || b.createdAt).getTime()
    );
    const courseName = courses.find((c) => c.id === formData.courseId)?.name || 'N/A';
    const studentName = `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim();

    const fmtDate = (d: string | null | undefined): string => {
      if (!d) return '';
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '';
      return `${dt.getFullYear()}-${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    };

    const invoiceNo = (() => {
      let h = 0;
      for (let i = 0; i < payment.id.length; i++) h = ((h << 5) - h + payment.id.charCodeAt(i)) | 0;
      return String((Math.abs(h) % 9000) + 1000);
    })();

    let cum = 0;
    const tableRows = sortedPayments.map((p, i) => {
      cum += Number(p.feeTaken || 0);
      const rem = Math.max(0, totalFee - cum);
      return `<tr>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${i + 1}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${fmtDate(p.paidAt || p.createdAt)}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${Number(p.feeTaken || 0).toLocaleString('en-IN')}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${rem.toLocaleString('en-IN')}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${p.nextInstallmentDate ? fmtDate(p.nextInstallmentDate) : ''}</td>
      </tr>`;
    }).join('');

    const emptyRow = tableRows ? '' : `<tr><td colspan="5" style="padding:32px 16px;text-align:center;font-size:13px;color:#9CA3AF;border:1px solid #dce8ee;">No payment records</td></tr>`;

    receiptWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${invoiceNo}</title>
  <meta charset="utf-8">
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    html, body { width: 210mm; margin: 0 auto; background: white; font-family: Arial, Helvetica, sans-serif; }
    .page { width: 210mm; min-height: 297mm; background: white; display: flex; flex-direction: column; }
    .content { flex: 1; display: flex; flex-direction: column; }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;height:120px;flex-shrink:0;">
    <div style="width:42%;display:flex;align-items:center;padding:0 30px;">
      <img src="${origin}/logo-invoice.png" style="height:54px;width:auto;display:block;" alt="DnyanSetu">
    </div>
    <div style="flex:1;background:#1A7A8E;-webkit-print-color-adjust:exact;print-color-adjust:exact;display:flex;align-items:center;justify-content:flex-end;padding-right:30px;">
      <span style="color:white;font-size:78px;font-weight:900;font-family:Arial Black,Arial,sans-serif;letter-spacing:2px;line-height:1;">INVOICE</span>
    </div>
  </div>

  <!-- Content (flex:1 pushes footer to bottom) -->
  <div class="content">

    <!-- Meta info -->
    <div style="padding:30px 30px 18px 30px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">Invoice No: <strong style="color:#111827;">${invoiceNo}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Date: <strong style="color:#111827;">${fmtDate(new Date().toISOString())}</strong></span>
        <span></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">Name: <strong style="color:#111827;">${studentName}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Phone No: <strong style="color:#111827;">${formData.phone || 'N/A'}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Email: <strong style="color:#111827;">${formData.email || 'N/A'}</strong></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">Admission Date: <strong style="color:#111827;">${fmtDate(payment.paidAt || payment.createdAt)}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Course Fees: <strong style="color:#111827;">${totalFee.toLocaleString('en-IN')}</strong></span>
        <span></span>
      </div>
      <div>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Course Name: <strong style="color:#111827;">${courseName}</strong></span>
      </div>
    </div>

    <!-- Table -->
    <div style="padding:8px 30px 16px 30px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#d4e8f2;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Sr. No</th>
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Date</th>
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Fees Paid</th>
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Fees Remaining</th>
            <th style="padding:13px 16px;text-align:left;font-size:13px;font-weight:400;color:#374151;border:1px solid #c5d8e2;">Next Installment Date</th>
          </tr>
        </thead>
        <tbody>${tableRows || emptyRow}</tbody>
      </table>
    </div>

    <!-- Note + Signature -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:16px 30px 40px 30px;gap:12px;">
      <div style="display:flex;justify-content:flex-end;">
        <span style="font-size:13px;font-weight:400;color:#1F2937;letter-spacing:0.2px;">DNYANSETU EDUCATION &amp; IT INSTITUTION INDIA</span>
      </div>
      <div style="padding:10px 14px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:4px;font-size:12px;color:#92400E;font-style:italic;">
        <strong>Note:</strong> Fees once paid is not refundable at any reason.
      </div>
    </div>

  </div><!-- end .content -->

  <!-- Footer (always at page bottom) -->
  <div style="flex-shrink:0;background:#1A7A8E;-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:22px 30px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <p style="font-weight:700;font-size:13px;color:white;margin-bottom:7px;">Institute Address:</p>
      <p style="font-size:11.5px;color:rgba(255,255,255,0.85);max-width:380px;line-height:1.65;">${[branchInfo?.name, branchInfo?.address, branchInfo?.location].filter(Boolean).join(', ') || 'DnyanSetu Institute, Hadapsar, Pune'}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;padding-top:2px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 9.5a19.79 19.79 0 01-3.13-8.63A2 2 0 013.54 3h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 10.5a16 16 0 006 6l.92-.92a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0121.5 18z"/></svg>
        <span style="font-size:13px;color:white;">${branchInfo?.phone1 || '+91 987 654 3210'}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
        <span style="font-size:13px;color:white;">${branchInfo?.adminEmail || 'dnyansetu@gmail.com'}</span>
      </div>
    </div>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
    receiptWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const branchIdToUse = user?.branchId || formData.branchId;

    // Full validation
    const fieldErrors = validateFields();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      // Mark all fields touched to show all errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(fieldErrors).forEach(k => { allTouched[k] = true; });
      setTouched(prev => ({ ...prev, ...allTouched }));
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && editId) {
        // ── UPDATE ──
        // If a new photo was selected, send as FormData so multer can process the file
        if (photoFile) {
          const fd = new FormData();
          fd.append('firstName', formData.firstName);
          if (formData.middleName) fd.append('middleName', formData.middleName);
          fd.append('lastName', formData.lastName);
          fd.append('email', formData.email);
          fd.append('phone', formData.phone);
          fd.append('address', formData.address);
          if (formData.dob) fd.append('dob', formData.dob);
          fd.append('photo', photoFile);
          await studentService.updateWithPhoto(editId, fd);
        } else {
          // Plain JSON update — never include photo here; only string-safe fields
          const updatePayload: Record<string, string> = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
          };
          if (formData.middleName) updatePayload.middleName = formData.middleName;
          if (formData.dob) updatePayload.dob = formData.dob;
          await studentService.update(editId, updatePayload);
        }

        // Record new payment installment if entered
        if (newPaymentAmount && Number(newPaymentAmount) > 0 && enrollment) {
          const totalPaid = enrollment.payments.reduce((sum, p) => sum + p.feeTaken, 0);
          const remaining = enrollment.courseFee - totalPaid;
          if (Number(newPaymentAmount) > remaining) {
            setPaymentAmountError(`Cannot exceed remaining balance of ₹${remaining.toLocaleString('en-IN')}`);
            setLoading(false);
            return;
          }
          await paymentService.create({
            enrollmentId: enrollment.id,
            feeTaken: Number(newPaymentAmount),
          });
        }

        toast.success('Student updated successfully');
        setSuccess(true);
      } else {
        // ── CREATE ──
        // If a photo file is selected, upload as multipart/form-data
        let studentRes: any;
        if (photoFile) {
          const fd = new FormData();
          fd.append('firstName', formData.firstName);
          if (formData.middleName) fd.append('middleName', formData.middleName);
          fd.append('lastName', formData.lastName);
          fd.append('email', formData.email);
          fd.append('phone', formData.phone);
          fd.append('address', formData.address);
          if (formData.dob) fd.append('dob', formData.dob);
          fd.append('branchId', branchIdToUse!);
          fd.append('photo', photoFile);
          studentRes = await studentService.register(fd);
        } else {
          studentRes = await studentService.register({
            firstName: formData.firstName,
            ...(formData.middleName ? { middleName: formData.middleName } : {}),
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            ...(formData.dob ? { dob: formData.dob } : {}),
            branchId: branchIdToUse!,
          });
        }
        const studentId = studentRes.data.id;
        if (formData.courseId) {
          const totalFee = Number(formData.totalFees);
          const paidFee = Number(formData.paidFees) || 0;
          // Determine payment status
          let paymentStatus: 'FULL_PAID' | 'PARTIAL_PAID' | 'PENDING' = 'PENDING';
          if (paidFee >= totalFee) paymentStatus = 'FULL_PAID';
          else if (paidFee > 0) paymentStatus = 'PARTIAL_PAID';

          const enrollRes: any = await studentService.enroll(studentId, formData.courseId, String(totalFee), paymentStatus);

          // If initial payment was made, record it
          if (paidFee > 0) {
            const enrollmentId = enrollRes?.data?.id || enrollRes?.id;
            if (enrollmentId) {
              await paymentService.create({
                enrollmentId,
                feeTaken: paidFee,
                ...(formData.nextInstallmentDate ? { nextInstallmentDate: formData.nextInstallmentDate } : {}),
              });
            }
          }
        }
        toast.success('Student added successfully');
        setSuccess(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || (isEditMode ? 'Failed to update student' : 'Failed to add student'));
    } finally {
      setLoading(false);
    }
  };

  // ── Loading skeleton while fetching existing student ──
  if (fetchingStudent) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[40vh]">
        <Loader2 className="animate-spin text-[#4DB8CA] mb-4" size={40} />
        <p className="text-gray-500 font-medium">Loading student details...</p>
      </div>
    );
  }

  // ── Success screen ──
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-20 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-[#E6F6F9] rounded-full flex items-center justify-center text-[#4DB8CA] mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-[#1A2332]">
          {isEditMode ? 'Student Updated Successfully!' : 'Student Added Successfully!'}
        </h2>
        {isEditMode ? (
          <button
            onClick={() => navigate(-1)}
            className="mt-6 bg-[#C8102E] text-white px-8 py-2.5 rounded-[4px] text-[14px] font-medium hover:bg-red-800 transition-colors"
          >
            Back to Students
          </button>
        ) : (
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({ firstName: '', middleName: '', lastName: '', email: '', phone: '', address: '', dob: '', courseId: '', branchId: '', totalFees: '', paidFees: '', nextInstallmentDate: '' });
                setPhotoFile(null);
                setPhotoPreview(null);
              }}
              className="bg-[#C8102E] text-white px-8 py-2.5 rounded-[4px] text-[14px] font-medium hover:bg-red-800 transition-colors"
            >
              Add Another
            </button>
            <button
              onClick={() => navigate('/branch-admin/students')}
              className="px-8 py-2.5 border border-[#E2E8F0] rounded-[4px] text-[14px] font-medium text-[#64748B] hover:bg-gray-50 transition-colors"
            >
              View Students
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-[8px] p-6 sm:p-8 max-w-screen-lg w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">

        {/* Photo Upload Area */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-semibold text-[#1A2332]">
            {isEditMode ? 'Student Photo' : 'Upload Student Photo'} <span className="text-[#C8102E]">*</span>
          </label>

          {/* Hidden file input */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              validateAndSetPhoto(f);
            }}
          />

          {photoPreview ? (
            /* ── Photo (avatar) uploaded state ── */
            <div className="w-full rounded-xl border border-[#E2E8F0] bg-white py-6 flex flex-col items-center gap-3 shadow-sm">
              <div className="relative">
                <img src={photoPreview} alt="preview" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-[#E2E8F0]" />
                <span className="absolute bottom-0 right-0 w-6 h-6 bg-[#4DB8CA] rounded-full flex items-center justify-center border-2 border-white">
                  <ImageIcon size={12} className="text-white" />
                </span>
              </div>
              {photoFile && <p className="text-[13px] font-medium text-[#1A2332] max-w-[180px] truncate">{photoFile.name}</p>}
              <div className="flex items-center gap-3 mt-1">
                <button type="button" onClick={handleViewPhoto} className="text-[13px] font-medium text-[#4DB8CA] hover:underline transition-colors">
                  View Photo
                </button>
                <span className="w-px h-4 bg-[#E2E8F0]" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); photoInputRef.current?.click(); }}
                  className="h-8 px-4 rounded-lg border border-[#1F2937] bg-white text-[#111827] text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  <RotateCcw size={13} /> Replace
                </button>
              </div>
            </div>
          ) : (
            /* ── Empty upload state ── */
            <div
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); photoInputRef.current?.click(); }}
              className="w-full h-32 sm:h-36 rounded-md border border-dashed border-[#E2E8F0] bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <ImageIcon size={28} className="text-[#94A3B8] mb-2" />
              <p className="text-[14px] font-medium text-[#1A2332]">
                <span className="text-[#4DB8CA] font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-[12px] text-[#94A3B8] mt-1">JPG, JPEG, PNG less than 1MB</p>
            </div>
          )}
        </div>

        {/* Form Grid — matches Figma layout exactly */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

          {/* Row 1: First Name | Middle Name */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-[#1A2332]">First Name <span className="text-[#C8102E]">*</span></label>
            <input name="firstName" value={formData.firstName} onChange={handleInputChange} onBlur={handleBlur} type="text" placeholder="Enter students first name" className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA] ${touched.firstName && errors.firstName ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`} />
            {touched.firstName && errors.firstName && <p className="text-[12px] text-[#C8102E]">{errors.firstName}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-[#1A2332]">Middle Name <span className="text-[#C8102E]">*</span></label>
            <input name="middleName" value={formData.middleName} onChange={handleInputChange} onBlur={handleBlur} type="text" placeholder="Enter students middle name" className="w-full h-11 px-4 bg-white border border-[#E2E8F0] rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA]" />
          </div>

          {/* Row 2: Last Name | Phone Number */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-[#1A2332]">Last Name <span className="text-[#C8102E]">*</span></label>
            <input name="lastName" value={formData.lastName} onChange={handleInputChange} onBlur={handleBlur} type="text" placeholder="Enter students last name" className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA] ${touched.lastName && errors.lastName ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`} />
            {touched.lastName && errors.lastName && <p className="text-[12px] text-[#C8102E]">{errors.lastName}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-[#1A2332]">Phone Number <span className="text-[#C8102E]">*</span></label>
            <input name="phone" value={formData.phone} onChange={handleInputChange} onBlur={handleBlur} type="text" placeholder="Enter student phone number" className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA] ${touched.phone && errors.phone ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`} />
            {touched.phone && errors.phone && <p className="text-[12px] text-[#C8102E]">{errors.phone}</p>}
          </div>

          {/* Row 3: Email Address | Address */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-[#1A2332]">Email Address <span className="text-[#C8102E]">*</span></label>
            <input name="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} type="email" placeholder="Enter email address" className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA] ${touched.email && errors.email ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`} />
            {touched.email && errors.email && <p className="text-[12px] text-[#C8102E]">{errors.email}</p>}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-[#1A2332]">Address <span className="text-[#C8102E]">*</span></label>
            <input name="address" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} type="text" placeholder="Enter student address" className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA] ${touched.address && errors.address ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`} />
            {touched.address && errors.address && <p className="text-[12px] text-[#C8102E]">{errors.address}</p>}
          </div>

          {/* Row 4: Select Course | Full Course Fees */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-semibold text-[#1A2332]">Select Course <span className="text-[#C8102E]">*</span></label>
            <div className="relative">
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleInputChange}
                onBlur={handleBlur}
                disabled={isEditMode}
                className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none appearance-none cursor-pointer focus:border-[#4DB8CA] disabled:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:text-[#64748B] ${touched.courseId && errors.courseId ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`}
              >
                <option value="">Select Course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown size={16} className="text-[#64748B]" />
              </div>
            </div>
            {touched.courseId && errors.courseId && <p className="text-[12px] text-[#C8102E]">{errors.courseId}</p>}
            {isEditMode && (
              <p className="text-[11px] text-[#94A3B8]">Course cannot be changed after enrollment.</p>
            )}
          </div>
          {!isEditMode && (
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-[#1A2332]">Full Course Fees <span className="text-[#C8102E]">*</span></label>
              <input name="totalFees" value={formData.totalFees} onChange={handleInputChange} onBlur={handleBlur} type="number" min="0" placeholder="Enter full course fees" className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA] ${touched.totalFees && errors.totalFees ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`} />
              {touched.totalFees && errors.totalFees && <p className="text-[12px] text-[#C8102E]">{errors.totalFees}</p>}
            </div>
          )}

          {/* Row 5: Paid Course Fees | Next Installment Date (add mode only) */}
          {!isEditMode && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-[#1A2332]">Paid Course Fees <span className="text-[#C8102E]">*</span></label>
                <input name="paidFees" value={formData.paidFees} onChange={handleInputChange} onBlur={handleBlur} type="number" min="0" placeholder="Enter paid course fees" className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA] ${touched.paidFees && errors.paidFees ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`} />
                {touched.paidFees && errors.paidFees && <p className="text-[12px] text-[#C8102E]">{errors.paidFees}</p>}
              </div>
              {(() => {
                const hasBalance = Number(formData.totalFees) > 0 && Number(formData.paidFees) < Number(formData.totalFees);
                return (
                  <div className="flex flex-col gap-2">
                    <label className={`text-[14px] font-semibold ${hasBalance ? 'text-[#1A2332]' : 'text-[#94A3B8]'}`}>
                      Next Installment Date {hasBalance && <span className="text-[#C8102E]">*</span>}
                    </label>
                    <input
                      name="nextInstallmentDate"
                      value={formData.nextInstallmentDate}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      disabled={!hasBalance}
                      placeholder="Enter next installment date"
                      className={`w-full h-11 px-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none transition-colors
                        ${!hasBalance ? 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed opacity-60' : touched.nextInstallmentDate && errors.nextInstallmentDate ? 'border-[#C8102E] focus:border-[#C8102E]' : 'border-[#E2E8F0] focus:border-[#4DB8CA]'}`}
                    />
                    {hasBalance && touched.nextInstallmentDate && errors.nextInstallmentDate && (
                      <p className="text-[12px] text-[#C8102E]">{errors.nextInstallmentDate}</p>
                    )}
                    {!hasBalance && Number(formData.totalFees) > 0 && (
                      <p className="text-[11px] text-[#008A27] font-medium">Fees fully paid — no installment needed.</p>
                    )}
                  </div>
                );
              })()}
            </>
          )}

        </div>

        {/* Fee Summary + Installment table (add mode only) */}
        {!isEditMode && Number(formData.totalFees) > 0 && (
          <div className="flex flex-col gap-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] p-4">
              <div className="flex flex-col gap-1 items-center">
                <p className="text-[12px] text-[#64748B]">Total Fee</p>
                <p className="text-[16px] font-bold text-[#1A2332]">₹{Number(formData.totalFees).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex flex-col gap-1 items-center border-x border-[#E2E8F0]">
                <p className="text-[12px] text-[#64748B]">Paid Now</p>
                <p className="text-[16px] font-bold text-[#008A27]">₹{(Number(formData.paidFees) || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex flex-col gap-1 items-center">
                <p className="text-[12px] text-[#64748B]">Remaining</p>
                <p className={`text-[16px] font-bold ${Math.max(0, Number(formData.totalFees) - (Number(formData.paidFees) || 0)) > 0 ? 'text-[#C8102E]' : 'text-[#008A27]'}`}>
                  ₹{Math.max(0, Number(formData.totalFees) - (Number(formData.paidFees) || 0)).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Installment preview row */}
            {Number(formData.paidFees) > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-[#1A2332]">Installment Preview</p>
                <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
                  <table className="w-full text-[13px]">
                    <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">#</th>
                        <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Amount</th>
                        <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Type</th>
                        <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Next Installment Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      <tr>
                        <td className="px-4 py-2.5 text-[#64748B]">1</td>
                        <td className="px-4 py-2.5 font-semibold text-[#008A27]">₹{Number(formData.paidFees).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#E6F9EE] text-[#008A27]">Initial Payment</span>
                        </td>
                        <td className="px-4 py-2.5 text-[#64748B]">
                          {formData.nextInstallmentDate
                            ? new Date(formData.nextInstallmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Payment Section (edit mode only) ── */}
        {isEditMode && enrollment && (() => {
          const totalPaid = enrollment.payments.reduce((sum, p) => sum + p.feeTaken, 0);
          const remaining = Math.max(0, enrollment.courseFee - totalPaid);
          const isFullyPaid = enrollment.paymentStatus === 'FULL_PAID';
          return (
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex items-center gap-3">
                <h3 className="text-[15px] font-semibold text-[#1A2332]">Fee & Payment Details</h3>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  isFullyPaid ? 'bg-[#E6F9EE] text-[#008A27]' :
                  enrollment.paymentStatus === 'PARTIAL_PAID' ? 'bg-[#FFF8E6] text-[#B45309]' :
                  'bg-[#FEF2F2] text-[#C8102E]'
                }`}>
                  {isFullyPaid ? 'Fully Paid' : enrollment.paymentStatus === 'PARTIAL_PAID' ? 'Partially Paid' : 'Pending'}
                </span>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[8px] p-4">
                <div className="flex flex-col gap-1 items-center">
                  <p className="text-[12px] text-[#64748B]">Total Fee</p>
                  <p className="text-[18px] font-bold text-[#1A2332]">₹{enrollment.courseFee.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex flex-col gap-1 items-center border-x border-[#E2E8F0]">
                  <p className="text-[12px] text-[#64748B]">Total Paid</p>
                  <p className="text-[18px] font-bold text-[#008A27]">₹{totalPaid.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <p className="text-[12px] text-[#64748B]">Remaining</p>
                  <p className={`text-[18px] font-bold ${remaining > 0 ? 'text-[#C8102E]' : 'text-[#008A27]'}`}>₹{remaining.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Payment history */}
              {enrollment.payments.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] font-semibold text-[#1A2332]">Payment History</p>
                  <div className="border border-[#E2E8F0] rounded-[8px] overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">#</th>
                          <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Amount Paid</th>
                          <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Date</th>
                          <th className="text-left px-4 py-2.5 text-[#64748B] font-medium">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {enrollment.payments.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-2.5 text-[#64748B]">{idx + 1}</td>
                            <td className="px-4 py-2.5 font-semibold text-[#008A27]">₹{p.feeTaken.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 text-[#64748B] flex items-center gap-1.5">
                              <Clock size={12} className="text-[#94A3B8]" />
                              {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(p)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E2E8F0] rounded-md text-[12px] font-medium text-[#1A2332] hover:bg-[#F8FAFC] transition-colors"
                              >
                                <Printer size={13} />
                                Print
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Record new payment */}
              {isFullyPaid ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-[#E6F9EE] border border-[#008A27]/20 rounded-[8px]">
                  <CheckCircle2 size={16} className="text-[#008A27] flex-shrink-0" />
                  <p className="text-[13px] text-[#008A27] font-medium">All fees have been paid in full. No further payment is required.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[14px] font-semibold text-[#1A2332]">
                    Record New Payment <span className="text-[12px] font-normal text-[#64748B]">(remaining: ₹{remaining.toLocaleString('en-IN')})</span>
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-[#64748B] font-medium">₹</span>
                    <input
                      type="number"
                      min="1"
                      max={remaining}
                      value={newPaymentAmount}
                      onChange={(e) => {
                        setNewPaymentAmount(e.target.value);
                        setPaymentAmountError('');
                      }}
                      placeholder="Enter amount"
                      className={`w-full h-11 pl-8 pr-4 bg-white border rounded-md text-[14px] text-[#1A2332] outline-none focus:border-[#4DB8CA] ${paymentAmountError ? 'border-[#C8102E]' : 'border-[#E2E8F0]'}`}
                    />
                  </div>
                  {paymentAmountError && <p className="text-[12px] text-[#C8102E]">{paymentAmountError}</p>}
                  <p className="text-[11px] text-[#94A3B8]">Leave blank if no payment is being recorded now.</p>
                </div>
              )}
            </div>
          );
        })()}


        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-6 pt-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => navigate('/branch-admin/students')}
            className="text-[15px] font-medium text-[#64748B] hover:text-[#1A2332] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#C8102E] text-white rounded-[6px] text-[14px] font-medium hover:bg-red-800 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2.5} />}
            {isEditMode ? 'Update Student' : 'Add Student'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AddStudent;
