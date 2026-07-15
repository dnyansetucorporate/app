import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, ArrowLeft, ChevronLeft, ChevronRight, ArrowRight, Loader2, FileText } from 'lucide-react';
import hotToast from 'react-hot-toast';
import { cn } from '@/utils/helpers';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { certificateService } from '@/services/certificate.service';
import { branchService } from '@/services/branch.service';
import { paymentService } from '@/services/payment.service';
import { buildImageUrl } from '@/utils/imageUtils';
import { downloadAsPng, branchCertificateHtml } from '@/utils/branchCertificate';

const PAGE_SIZE = 10;

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

/** Certificate date format matching Figma: "Nov, 2025" */
const certResultDateFmt = (d?: string | null) => {
  if (!d) return 'N/A';
  const dt = new Date(d);
  const mon = dt.toLocaleDateString('en-US', { month: 'short' });
  return `${mon}, ${dt.getFullYear()}`;
};

// Must match the canonical grading formula in
// backend/src/modules/student-portal/student-portal.service.ts (submitExamResult),
// which is what's persisted to ExamResult.grade and shown everywhere else.
const marksToGrade = (marks?: number | null): string => {
  if (marks == null) return '—';
  if (marks >= 75) return 'A';
  if (marks >= 50) return 'B';
  return 'C';
};

// ─── Reusable Pagination ──────────────────────────────────────────────────────
const Pagination = ({
  meta,
  page,
  onPage,
  label,
}: {
  meta: any;
  page: number;
  onPage: (p: number) => void;
  label: string;
}) => {
  if (!meta) return null;
  const total = meta.total ?? 0;
  const totalPages = meta.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const windowSize = 4;
  let start = Math.max(1, page - 1);
  let end   = Math.min(totalPages, start + windowSize - 1);
  start     = Math.max(1, end - windowSize + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E8F0] bg-white">
      <p className="text-[14px] text-[#64748B]">
        Showing data {from} to {to} of {total} {label}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        {start > 1 && <span className="px-1 text-[#94A3B8]">...</span>}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded text-[14px] transition-colors',
              p === page ? 'bg-[#0A3D4D] text-white' : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-gray-50',
            )}
          >
            {p}
          </button>
        ))}
        {end < totalPages && <span className="px-1 text-[#94A3B8]">...</span>}
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const Certificates: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'branch' | 'student'>('branch');
  const { setPageHeader } = usePageHeader();

  // Branch tab (main list & drill-down)
  const [branchCerts, setBranchCerts]     = useState<any[]>([]);
  const [branchMeta, setBranchMeta]       = useState<any>(null);
  const [branchPage, setBranchPage]       = useState(1);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchSearch, setBranchSearch]   = useState('');

  // Student tab (main branch list)
  const [stuBranches, setStuBranches]       = useState<any[]>([]);
  const [stuBranchMeta, setStuBranchMeta]   = useState<any>(null);
  const [stuBranchPage, setStuBranchPage]   = useState(1);
  const [stuBranchLoading, setStuBranchLoading] = useState(false);
  const [stuBranchSearch, setStuBranchSearch]   = useState('');

  // Shared drill-down (branch → students)
  // `drillDownSource` tells us which tab opened the drill-down
  const [selectedBranch, setSelectedBranch]   = useState<any | null>(null);
  const [drillDownSource, setDrillDownSource] = useState<'branch' | 'student'>('branch');
  const [branchStudents, setBranchStudents]   = useState<any[]>([]);
  const [bsMeta, setBsMeta]                   = useState<any>(null);
  const [bsPage, setBsPage]                   = useState(1);
  const [bsLoading, setBsLoading]             = useState(false);
  const [bsSearch, setBsSearch]               = useState('');

  // ── Page header ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedBranch) {
      setPageHeader(
        `View ${selectedBranch.branchName || ''} Student list`,
        'View student records for this branch, including course enrollment and exam performance.',
      );
    } else {
      setPageHeader(
        'Certificates',
        'View students certificates based on exam results and course completion.',
      );
    }
  }, [selectedBranch, setPageHeader]);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchBranchCerts = useCallback(async (page: number, search: string) => {
    setBranchLoading(true);
    try {
      const res: any = await certificateService.list({ tab: 'branch', page, limit: PAGE_SIZE, search: search || undefined });
      setBranchCerts(res?.data || []);
      setBranchMeta(res?.meta || null);
    } catch {
      hotToast.error('Failed to load branch certificates');
    } finally {
      setBranchLoading(false);
    }
  }, []);

  const fetchStuBranches = useCallback(async (page: number, search: string) => {
    setStuBranchLoading(true);
    try {
      const res: any = await certificateService.list({ tab: 'branch', page, limit: PAGE_SIZE, search: search || undefined });
      setStuBranches(res?.data || []);
      setStuBranchMeta(res?.meta || null);
    } catch {
      hotToast.error('Failed to load branches');
    } finally {
      setStuBranchLoading(false);
    }
  }, []);

  const fetchBranchStudents = useCallback(async (branchId: string, page: number, search: string) => {
    setBsLoading(true);
    try {
      const res: any = await certificateService.listBranchStudents(branchId, { page, limit: PAGE_SIZE, search: search || undefined });
      const list = res?.certs || res?.data || [];
      setBranchStudents(list);
      setBsMeta(res?.meta || null);
    } catch {
      hotToast.error('Failed to load branch students');
    } finally {
      setBsLoading(false);
    }
  }, []);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'branch') fetchBranchCerts(branchPage, branchSearch);
  }, [activeTab, branchPage, branchSearch, fetchBranchCerts]);

  useEffect(() => {
    if (activeTab === 'student') fetchStuBranches(stuBranchPage, stuBranchSearch);
  }, [activeTab, stuBranchPage, stuBranchSearch, fetchStuBranches]);

  useEffect(() => {
    if (selectedBranch) fetchBranchStudents(selectedBranch.id, bsPage, bsSearch);
  }, [selectedBranch, bsPage, bsSearch, fetchBranchStudents]);

  // ── Turn the gold-on-white ornament PNG into a crisp gold-on-transparent layer ─
  // The source art is gold line work on a solid white background. A plain
  // white-key leaves the gold pale and faint because most pixels are light
  // (anti-aliased toward white). Instead we drop the white, deepen the gold so it
  // reads as a rich metallic gold (matching the Figma), and set per-pixel alpha
  // from ink density so the line work stays solid and clear over the teal page.


  /** Fetch a remote image and return a data URL so html2canvas can render it inside srcdoc iframes. */
  const imageToDataUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // ── Student Certificate HTML (matches Figma design) ────────────────────────
  const studentCertificateHtml = (cert: any, photoDataUrl?: string | null) => {
    const o = window.location.origin;
    const firstName   = cert.student?.firstName  || '';
    const middleName  = cert.student?.middleName || '';
    const lastName    = cert.student?.lastName   || '';
    const middleInitial = middleName ? `${middleName[0].toUpperCase()}.` : '';
    const studentName = [firstName, middleInitial, lastName].filter(Boolean).join(' ') || 'Student Name';
    const honorific   = cert.student?.gender === 'FEMALE' ? 'MS.' : 'MR.';
    const prn         = cert.student?.prn   || 'N/A';
    const photoSrc    = photoDataUrl || buildImageUrl(cert.student?.photo || cert.student?.photoUrl);
    const certNo      = cert.certNo || cert.id?.slice(-6)?.toUpperCase() || '000000';
    const courseName  = cert.course?.name || cert.courseName || 'Course';
    const branchLoc   = cert.branch?.location || cert.branch?.name || cert.branchName || 'Hadapsar';
    const grade       = marksToGrade(cert.marks);
    const resultDate  = certResultDateFmt(cert.issuedAt);
    const initials    = `${firstName[0] || 'S'}${lastName[0] || ''}`.toUpperCase();

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Certificate – ${studentName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;}
body{background:#e5e7eb;font-family:'Montserrat',sans-serif;}
.page{width:1122px;height:794px;position:relative;background:#fff;overflow:hidden;font-family:'Montserrat',sans-serif;text-align:center;word-spacing:normal;}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;}
.logo{position:absolute;left:38px;top:28px;width:220px;z-index:5;}
.meta{position:absolute;left:370px;top:28px;width:330px;text-align:right;font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#0F172A;line-height:1.55;z-index:10;}
.meta-line{word-break:break-word;text-align:right;}
.meta-lbl{font-weight:400;color:#0F172A;}
.ctr{position:absolute;left:0;text-align:center;z-index:3;}
.inst{font-family:'Cinzel',serif;font-weight:700;color:#14596E;font-size:38px;line-height:1.2;text-transform:uppercase;letter-spacing:0;word-spacing:0;}
.affil{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:400;color:#444;line-height:1.5;letter-spacing:0;word-spacing:0;text-align:center;}
.presented{font-family:'Cinzel',serif;font-weight:700;color:#262321;font-size:26px;line-height:1.2;letter-spacing:0;word-spacing:0;text-transform:uppercase;}
.mr{font-family:'Cinzel',serif;font-size:28px;font-weight:700;color:#5b5651;vertical-align:baseline;line-height:1.05;letter-spacing:0;word-spacing:0;margin-right:14px;}
.name-text{font-family:'Cinzel',serif;font-size:42px;font-weight:700;color:#14596E;line-height:1.05;vertical-align:baseline;letter-spacing:0;word-spacing:0;}
.completion{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:400;color:#333;line-height:1.5;letter-spacing:0;word-spacing:0;}
.completion b{font-family:'Montserrat',sans-serif;font-weight:700;color:#222;}
.grade{font-family:'Montserrat',sans-serif;color:#000;font-weight:700;font-size:20px;}
.date{font-family:'Montserrat',sans-serif;font-size:17px;font-weight:400;color:#555;line-height:1.2;letter-spacing:0;word-spacing:0;}
.stamp-iso{position:absolute;left:35px;top:658px;height:70px;width:auto;z-index:5;}
.stamp-msme{position:absolute;left:190px;top:668px;height:52px;width:auto;z-index:5;}
.stamp-iso,.stamp-msme{display:block;object-fit:contain;}
.sigtext{position:absolute;left:540px;top:665px;width:340px;text-align:center;z-index:3;}
.sig-svg{position:absolute;left:615px;top:598px;width:190px;height:68px;z-index:3;object-fit:contain;}
.sig-lbl{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:400;color:#0F172A;line-height:1.5;}
.sig-org{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#14596E;line-height:1.5;}
.photo{position:absolute;left:720px;top:55px;width:290px;height:290px;border-radius:50%;overflow:hidden;border:7px solid #C8A020;background:#d1e8ec;display:flex;align-items:center;justify-content:center;z-index:4;}
.photo img{width:100%;height:100%;object-fit:cover;}
.photo-initials{font-family:'Montserrat',sans-serif;font-size:80px;font-weight:700;color:#14596E;}
.medal{position:absolute;left:865px;top:265px;width:215px;z-index:6;}
</style>
</head>
<body>
<div class="page">
  <img class="bg" src="${o}/certificate-assets/student/bg.png" alt="" />

  <img class="logo" src="${o}/logo.svg" alt="DnyanSetu" />
  <div class="meta">
    <div class="meta-line"><span class="meta-lbl">Certificate No:</span> ${certNo}</div>
    <div class="meta-line"><span class="meta-lbl">PRN No:</span> ${prn}</div>
  </div>

  <div class="ctr inst" style="top:140px;width:720px;text-align:center;">DNYANSETU EDUCATION &amp; IT<br>INSTITUTE INDIA</div>
  <div class="ctr affil" style="top:248px;width:700px;text-align:center;">(Affiliated by Ministry of Corporate Affairs Government of India<br>CIN.U85490PN2026PTC252150)</div>
  <div class="ctr presented" style="top:336px;width:720px;text-align:center;">THIS CERTIFICATE IS PROUDLY PRESENTED TO</div>
  <div class="ctr" style="top:382px;width:720px;padding-left:70px;white-space:nowrap;display:flex;align-items:baseline;justify-content:center;">
    <span class="mr">${honorific}</span><span class="name-text">${studentName}</span>
  </div>
  <div class="ctr completion" style="top:472px;width:720px;text-align:center;">for successfully completed <b>${courseName}</b></div>
  <div class="ctr completion" style="top:506px;width:720px;text-align:center;">Held at Dnyansetu Institute, ${branchLoc} with <span class="grade">${grade}</span> Grade.</div>
  <div class="ctr date" style="top:552px;width:720px;text-align:center;">Date of Result: ${resultDate}</div>

  <img class="stamp-iso" src="${o}/certificate-assets/student/iso.svg" alt="ISO" crossorigin="anonymous" />
  <img class="stamp-msme" src="${o}/certificate-assets/student/msme.svg" alt="MSME" crossorigin="anonymous" />


  <img class="sig-svg" src="${o}/Superadmin%20Signature.svg" alt="Signature" crossorigin="anonymous" />
  <div class="sigtext">
    <div class="sig-lbl">Chairman &amp; Managing Director</div>
    <div class="sig-org">DNYANSETU INSTITUTE INDIA</div>
  </div>

  <div class="photo">
    ${photoSrc ? `<img src="${photoSrc}" alt="Photo" crossorigin="anonymous" />` : `<span class="photo-initials">${initials}</span>`}
  </div>
  <img class="medal" src="${o}/certificate-assets/student/badge.svg" alt="" crossorigin="anonymous" />
</div>
</body>
</html>`;
  };

  const handleStudentCertDownload = async (certId: string) => {
    const toastId = hotToast.loading('Generating certificate image…');
    try {
      const certRes: any = await certificateService.getById(certId);
      const cert = certRes?.data || certRes;
      const name = `${cert.student?.firstName || ''} ${cert.student?.lastName || ''}`.trim() || certId;
      const photoUrl = buildImageUrl(cert.student?.photo || cert.student?.photoUrl);
      const photoDataUrl = photoUrl ? await imageToDataUrl(photoUrl) : null;
      await downloadAsPng(
        studentCertificateHtml(cert, photoDataUrl || photoUrl),
        `certificate-${name.replace(/\s+/g, '-')}.png`,
      );
      hotToast.success('Certificate downloaded', { id: toastId });
    } catch {
      hotToast.error('Failed to download certificate', { id: toastId });
    }
  };


  const handleBranchCertDownload = async (branch: any) => {
    const toastId = hotToast.loading('Generating certificate image…');
    try {
      const branchRes: any = await branchService.getById(branch.id);
      const fullBranch = branchRes?.data || branchRes;
      await downloadAsPng(
        branchCertificateHtml(fullBranch),
        `authority-certificate-${(fullBranch.name || branch.branchName || 'branch').replace(/\s+/g, '-')}.png`,
      );
      hotToast.success('Certificate downloaded', { id: toastId });
    } catch {
      hotToast.error('Failed to download certificate', { id: toastId });
    }
  };

  // ── Student Invoice HTML (matches Figma design) ─────────────────────────────
  const studentInvoiceHtml = (cert: any, payments: any[]) => {
    const o = window.location.origin;
    const studentName    = `${cert.student?.firstName || ''} ${cert.student?.lastName || ''}`.trim() || 'N/A';
    const invoiceNo      = cert.invoiceNo || cert.id?.slice(-4) || '0001';
    const today          = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
    const phone          = cert.student?.phone    || cert.student?.mobile    || 'N/A';
    const email          = cert.student?.email    || 'N/A';
    const prn            = cert.student?.prn      || 'N/A';
    const admissionDate  = fmtDate(cert.student?.createdAt || cert.student?.admissionDate || cert.enrollmentDate);
    const courseFees     = cert.enrollment?.courseFee || cert.courseFees || cert.course?.fees || 'N/A';
    const courseName     = cert.course?.name  || cert.courseName  || 'N/A';

    const paymentRows = payments.length > 0
      ? payments.map((p: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${p.date ? new Date(p.date).toISOString().slice(0,10) : fmtDate(p.createdAt)}</td>
          <td>${p.amount ?? p.feesPaid ?? ''}</td>
          <td>${p.remaining ?? p.feesRemaining ?? ''}</td>
          <td>${p.nextInstallmentDate ? new Date(p.nextInstallmentDate).toISOString().slice(0,10) : (p.dueDate ? new Date(p.dueDate).toISOString().slice(0,10) : '')}</td>
        </tr>`).join('')
      : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;">No payment records found.</td></tr>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice – ${studentName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;background:#fff;}
.page{width:794px;min-height:1122px;background:#fff;display:flex;flex-direction:column;}
/* header */
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:32px 40px 24px;}
.hdr-logo{height:48px;object-fit:contain;}
.invoice-badge{background:#0D6B78;color:#fff;font-size:38px;font-weight:900;letter-spacing:3px;padding:12px 28px;}
/* fields */
.fields{padding:0 40px;margin-bottom:6px;}
.field-row{display:flex;gap:0;margin-bottom:10px;}
.field{flex:1;font-size:13px;color:#1A2332;}
.field strong{font-weight:700;}
.course-row{padding:0 40px 16px;font-size:13px;color:#1A2332;}
.course-row strong{font-weight:700;}
/* table */
.tbl-wrap{padding:0 40px;flex:1;}
table{width:100%;border-collapse:collapse;font-size:13px;}
thead tr{background:#E8F4F6;}
th{padding:12px 16px;text-align:left;font-weight:600;color:#1A2332;font-size:12.5px;}
td{padding:14px 16px;color:#1A2332;border-bottom:1px solid #f1f5f9;}
tbody tr:last-child td{border-bottom:none;}
/* company name row */
.company-row{text-align:right;padding:20px 40px;font-size:12.5px;font-weight:700;color:#1A2332;}
/* footer */
.footer{background:#0D6B78;padding:22px 40px;display:flex;justify-content:space-between;align-items:center;margin-top:auto;}
.footer-addr{color:#fff;}
.footer-addr strong{font-size:12px;font-weight:700;display:block;margin-bottom:6px;}
.footer-addr p{font-size:11px;color:rgba(255,255,255,.88);line-height:1.65;}
.footer-contact{display:flex;flex-direction:column;gap:6px;}
.footer-contact span{font-size:11.5px;color:#fff;display:flex;align-items:center;gap:8px;}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <img class="hdr-logo" src="${o}/logo-invoice.png" alt="DnyanSetu" />
    <div class="invoice-badge">INVOICE</div>
  </div>

  <div class="fields">
    <div class="field-row">
      <div class="field">Invoice No: <strong>${invoiceNo}</strong></div>
      <div class="field">Date: <strong>${today}</strong></div>
      <div class="field"></div>
    </div>
    <div class="field-row">
      <div class="field">Name: <strong>${studentName}</strong></div>
      <div class="field">Phone No: <strong>${phone}</strong></div>
      <div class="field">Email: <strong>${email}</strong></div>
    </div>
    <div class="field-row">
      <div class="field">PRN No: <strong>${prn}</strong></div>
      <div class="field">Admission Date: <strong>${admissionDate}</strong></div>
      <div class="field">Course Fees: <strong>${courseFees}</strong></div>
    </div>
  </div>

  <div class="course-row">Course Name: <strong>${courseName}</strong></div>

  <div class="tbl-wrap">
    <table>
      <thead>
        <tr>
          <th>Sr. No</th>
          <th>Date</th>
          <th>Fees Paid</th>
          <th>Fees Remaining</th>
          <th>Next Installment Date</th>
        </tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </div>

  <div class="company-row">DNYANSETU EDUCATION &amp; IT INSTITUTE INDIA</div>

  <div class="footer">
    <div class="footer-addr">
      <strong>Institute Address:</strong>
      <p>DnyanSetu Institute, 2nd floor, Kapare Heights, above Nikhil 1 gram<br>
      Gold Jewellers, near hadapsar bhaji mandai, Hadapsar, Pune – 28</p>
    </div>
    <div class="footer-contact">
      <span>&#128222; +91 987 654 3210</span>
      <span>&#9993; dnyansetu@gmail.com</span>
    </div>
  </div>
</div>
</body>
</html>`;
  };

  const handleStudentInvoiceDownload = async (certRow: any) => {
    const toastId = hotToast.loading('Generating invoice image…');
    try {
      const studentId = certRow.student?.id || certRow.studentId;
      let payments: any[] = [];
      let matchedEnrollment: any = null;
      if (studentId) {
        const payRes: any = await paymentService.getStudentPayments(studentId);
        const summaries: any[] = payRes?.data?.enrollmentSummaries || payRes?.enrollmentSummaries || [];
        matchedEnrollment = summaries.find((e: any) => e.courseName === certRow.course?.name) || summaries[0] || null;
        payments = matchedEnrollment?.payments || [];
      }
      const certForInvoice = matchedEnrollment
        ? { ...certRow, enrollment: { courseFee: matchedEnrollment.courseFee } }
        : certRow;
      const name = `${certRow.student?.firstName || ''} ${certRow.student?.lastName || ''}`.trim() || certRow.id;
      await downloadAsPng(studentInvoiceHtml(certForInvoice, payments), `invoice-${name.replace(/\s+/g, '-')}.png`);
      hotToast.success('Invoice downloaded', { id: toastId });
    } catch {
      hotToast.error('Failed to download invoice', { id: toastId });
    }
  };

  // ── Drill-down enter helpers ───────────────────────────────────────────────
  const openStudentDrill = (row: any) => {
    setDrillDownSource('student');
    setSelectedBranch(row);
    setBsPage(1);
    setBsSearch('');
    setBranchStudents([]);
  };

  const closeDrill = () => {
    setSelectedBranch(null);
    setBranchStudents([]);
    setBsPage(1);
    setBsSearch('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DRILL-DOWN VIEW (shared by both tabs, columns differ by drillDownSource)
  // ─────────────────────────────────────────────────────────────────────────
  if (selectedBranch) {
    const isBranchDrill = drillDownSource === 'branch';
    const colCount = isBranchDrill ? 6 : 6;
    return (
      <div className="space-y-6">
        <button
          onClick={closeDrill}
          className="flex items-center gap-2 text-[#64748B] hover:text-[#1A2332] transition-colors text-[14px]"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-[18px] font-bold text-[#1A2332]">
              Students list ({bsMeta?.total ?? branchStudents.length} Students)
            </h3>
            <div className="flex items-center gap-2 w-full max-w-xs px-3 py-2 bg-white border border-[#E2E8F0] rounded-[8px]">
              <Search size={16} className="text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by name, ID"
                value={bsSearch}
                onChange={(e) => { setBsSearch(e.target.value); setBsPage(1); }}
                className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium w-20">Sr. No</th>
                  <th className="py-4 px-6 font-medium">Student ID</th>
                  <th className="py-4 px-6 font-medium">Student Name</th>
                  {isBranchDrill ? (
                    <>
                      <th className="py-4 px-6 font-medium">Issued Date</th>
                      <th className="py-4 px-6 font-medium">Exam Marks</th>
                    </>
                  ) : (
                    <>
                      <th className="py-4 px-6 font-medium">Course Name</th>
                      <th className="py-4 px-6 font-medium">Exam Grades</th>
                    </>
                  )}
                  <th className="py-4 px-6 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {bsLoading ? (
                  <tr>
                    <td colSpan={colCount} className="py-16 text-center">
                      <Loader2 className="animate-spin text-[#4DB8CA] mx-auto" size={28} />
                    </td>
                  </tr>
                ) : branchStudents.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="py-12 text-center text-[#64748B]">
                      No certificate records found for this branch.
                    </td>
                  </tr>
                ) : branchStudents.map((cert: any, i) => (
                  <tr
                    key={cert.id || i}
                    className={cn('hover:bg-[#F8FAFC] transition-colors', i % 2 === 1 && 'bg-[#F8FAFC]')}
                  >
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(bsPage - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{cert.student?.prn || cert.studentId || '—'}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">
                      {`${cert.student?.firstName || ''} ${cert.student?.lastName || ''}`.trim() || '—'}
                    </td>
                    {isBranchDrill ? (
                      <>
                        <td className="py-4 px-6 text-[14px] text-[#1A2332]">{fmtDate(cert.issuedAt)}</td>
                        <td className="py-4 px-6 text-[14px] font-bold text-[#0BB783]">
                          {cert.marks != null ? `${cert.marks}%` : '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-6 text-[14px] text-[#1A2332]">{cert.course?.name || '—'}</td>
                        <td className="py-4 px-6 text-[14px] font-semibold">
                          {cert.examStatus === 'NOT_APPEARED'
                            ? <span className="text-[#F59E0B]">Exam Not Given</span>
                            : cert.grade != null
                            ? <span className="text-[#0BB783]">{cert.grade}</span>
                            : <span className="text-[#64748B]">Pending</span>
                          }
                        </td>
                      </>
                    )}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {(isBranchDrill || (cert.examStatus !== 'NOT_APPEARED' && cert.examStatus !== 'PENDING')) && (
                          <button
                            onClick={() => handleStudentCertDownload(cert.id)}
                            className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                            title="Download Certificate"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleStudentInvoiceDownload(cert)}
                          className="text-[#0A3D4D] border border-[#0A3D4D] rounded-[4px] p-1.5 hover:bg-[#EEF3F5] transition-colors"
                          title="Download Invoice"
                        >
                          <FileText size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={bsMeta} page={bsPage} onPage={setBsPage} label="Students" />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-[8px] p-1 w-fit shadow-sm">
        {(['branch', 'student'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-6 py-2.5 rounded-[6px] text-[15px] font-medium transition-colors',
              activeTab === tab ? 'bg-[#C8102E] text-white' : 'text-[#1A2332] hover:bg-gray-50',
            )}
          >
            {tab === 'branch' ? 'Branch Certificate' : 'Student Certificate'}
          </button>
        ))}
      </div>

      {/* ── Branch Certificate tab ──────────────────────────────────────────── */}
      {activeTab === 'branch' && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-[18px] font-bold text-[#1A2332]">
              Branch list ({branchMeta?.total ?? branchCerts.length} Branch)
            </h3>
            <div className="flex items-center gap-2 w-full max-w-xs px-4 py-2 bg-white border border-[#E2E8F0] rounded-md">
              <Search size={16} className="text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by branch name"
                value={branchSearch}
                onChange={(e) => { setBranchSearch(e.target.value); setBranchPage(1); }}
                className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium w-20">Sr. No</th>
                  <th className="py-4 px-6 font-medium">Branch Name</th>
                  <th className="py-4 px-6 font-medium">Branch Created Date</th>
                  <th className="py-4 px-6 font-medium">Location</th>
                  <th className="py-4 px-6 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {branchLoading ? (
                  <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="animate-spin text-[#4DB8CA] mx-auto" size={28} /></td></tr>
                ) : branchCerts.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-[#64748B]">No branches found.</td></tr>
                ) : branchCerts.map((row, idx) => (
                  <tr key={row.id} className={cn('hover:bg-[#F8FAFC] transition-colors', idx % 2 === 1 && 'bg-[#F8FAFC]')}>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(branchPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{row.branchName || '—'}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{fmtDate(row.createdDate)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{row.location || '—'}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleBranchCertDownload(row)}
                        className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                        title="Download Branch Certificate"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={branchMeta} page={branchPage} onPage={setBranchPage} label="Branches" />
        </div>
      )}

      {/* ── Student Certificate tab ─────────────────────────────────────────── */}
      {activeTab === 'student' && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-[18px] font-bold text-[#1A2332]">
              Branch list ({stuBranchMeta?.total ?? stuBranches.length} Branch)
            </h3>
            <div className="flex items-center gap-2 w-full max-w-xs px-4 py-2 bg-white border border-[#E2E8F0] rounded-md">
              <Search size={16} className="text-[#64748B]" />
              <input
                type="text"
                placeholder="Search by branch name"
                value={stuBranchSearch}
                onChange={(e) => { setStuBranchSearch(e.target.value); setStuBranchPage(1); }}
                className="bg-transparent border-none focus:outline-none text-[14px] w-full text-[#1A2332] placeholder:text-[#64748B]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#4DB8CA] text-white text-[14px]">
                <tr>
                  <th className="py-4 px-6 font-medium w-20">Sr. No</th>
                  <th className="py-4 px-6 font-medium">Branch Name</th>
                  <th className="py-4 px-6 font-medium">Location</th>
                  <th className="py-4 px-6 font-medium">Exam Date</th>
                  <th className="py-4 px-6 font-medium">Passed Students</th>
                  <th className="py-4 px-6 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {stuBranchLoading ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="animate-spin text-[#4DB8CA] mx-auto" size={28} /></td></tr>
                ) : stuBranches.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-[#64748B]">No branches found.</td></tr>
                ) : stuBranches.map((row, idx) => (
                  <tr key={row.id} className={cn('hover:bg-[#F8FAFC] transition-colors', idx % 2 === 1 && 'bg-[#F8FAFC]')}>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{(stuBranchPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{row.branchName || '—'}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{row.location || '—'}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{fmtDate(row.examDate)}</td>
                    <td className="py-4 px-6 text-[14px] text-[#1A2332]">{row.passedLabel || `${row.passedStudents ?? 0}/${row.numStudents ?? 0}`}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => openStudentDrill(row)}
                        className="text-[#4DB8CA] border border-[#4DB8CA] rounded-[4px] p-1.5 hover:bg-[#E6F6F9] transition-colors"
                        title="View students"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={stuBranchMeta} page={stuBranchPage} onPage={setStuBranchPage} label="Branches" />
        </div>
      )}

    </div>
  );
};

export default Certificates;
