import { parseYMD } from './date';

const TEAL = '#1A7A8E';

export interface InvoiceInstallment {
  date: string;
  feesPaid: number;
  feesRemaining: number;
  nextInstallmentDate: string | null;
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  studentName: string;
  phone: string;
  email: string;
  prn: string;
  admissionDate: string;
  courseFee: number;
  courseName: string;
  installments: InvoiceInstallment[];
  branchAddress: string;
  branchPhone: string;
  branchEmail: string;
  logoUrl: string;
}

export function formatInvoiceDate(d: string | null | undefined): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

// nextInstallmentDate is a picked calendar date (no meaningful time-of-day),
// unlike the payment `date` above — route it through parseYMD so it can't
// drift a day by viewer timezone.
export function formatInvoiceCalendarDate(d: string | null | undefined): string {
  if (!d) return '';
  const dt = parseYMD(d);
  if (!dt) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function formatInvoiceCurrency(n: number): string {
  return n.toLocaleString('en-IN');
}

export function getInvoiceNumber(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return String((Math.abs(h) % 9000) + 1000);
}

export function buildInstallments(
  payments: Array<{ feeTaken: number | string; paidAt?: string | null; createdAt: string; nextInstallmentDate?: string | null }>,
  courseFee: number
): InvoiceInstallment[] {
  const sorted = [...payments].sort(
    (a, b) => new Date(a.paidAt || a.createdAt).getTime() - new Date(b.paidAt || b.createdAt).getTime()
  );
  let cumulative = 0;
  return sorted.map(p => {
    cumulative += Number(p.feeTaken);
    return {
      date: p.paidAt || p.createdAt,
      feesPaid: Number(p.feeTaken),
      feesRemaining: Math.max(0, courseFee - cumulative),
      nextInstallmentDate: p.nextInstallmentDate ?? null,
    };
  });
}

export function generateInvoiceHtml(data: InvoiceData): string {
  const tableRows = data.installments.length === 0
    ? `<tr><td colspan="5" style="padding:32px 16px;text-align:center;font-size:13px;color:#9CA3AF;border:1px solid #dce8ee;">No payment records</td></tr>`
    : data.installments.map((row, idx) => `<tr>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${idx + 1}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${formatInvoiceDate(row.date)}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${formatInvoiceCurrency(row.feesPaid)}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${formatInvoiceCurrency(row.feesRemaining)}</td>
        <td style="padding:24px 16px;font-size:13px;color:#1F2937;border:1px solid #d0e0e8;">${row.nextInstallmentDate ? formatInvoiceCalendarDate(row.nextInstallmentDate) : ''}</td>
      </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${data.invoiceNo}</title>
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
      <img src="${data.logoUrl}" style="height:54px;width:auto;display:block;" alt="DnyanSetu">
    </div>
    <div style="flex:1;background:${TEAL};-webkit-print-color-adjust:exact;print-color-adjust:exact;display:flex;align-items:center;justify-content:flex-end;padding-right:30px;">
      <span style="color:white;font-size:78px;font-weight:900;font-family:Arial Black,Arial,sans-serif;letter-spacing:2px;line-height:1;">INVOICE</span>
    </div>
  </div>

  <!-- Content -->
  <div class="content">

    <!-- Meta info -->
    <div style="padding:30px 30px 18px 30px;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">Invoice No: <strong style="color:#111827;">${data.invoiceNo}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Date: <strong style="color:#111827;">${formatInvoiceDate(data.invoiceDate)}</strong></span>
        <span></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">Name: <strong style="color:#111827;">${data.studentName}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Phone No: <strong style="color:#111827;">${data.phone || 'N/A'}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Email: <strong style="color:#111827;">${data.email || 'N/A'}</strong></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;margin-bottom:22px;">
        <span style="font-size:14px;color:#374151;line-height:1.6;">PRN No: <strong style="color:#111827;">${data.prn || 'N/A'}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Admission Date: <strong style="color:#111827;">${formatInvoiceDate(data.admissionDate)}</strong></span>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Course Fees: <strong style="color:#111827;">${formatInvoiceCurrency(data.courseFee)}</strong></span>
      </div>
      <div>
        <span style="font-size:14px;color:#374151;line-height:1.6;">Course Name: <strong style="color:#111827;">${data.courseName || 'N/A'}</strong></span>
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
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    <!-- Signature + Note -->
    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:16px 30px 40px 30px;gap:12px;">
      <div style="display:flex;justify-content:flex-end;">
        <span style="font-size:13px;font-weight:400;color:#1F2937;letter-spacing:0.2px;">DNYANSETU EDUCATION &amp; IT INSTITUTE INDIA</span>
      </div>
      <div style="padding:10px 14px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:4px;font-size:12px;color:#92400E;font-style:italic;">
        <strong>Note:</strong> Fees once paid is not refundable at any reason.
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div style="flex-shrink:0;background:${TEAL};-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:22px 30px;display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <p style="font-weight:700;font-size:13px;color:white;margin-bottom:7px;">Institute Address:</p>
      <p style="font-size:11.5px;color:rgba(255,255,255,0.85);max-width:380px;line-height:1.65;">${data.branchAddress}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;padding-top:2px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.69 9.5a19.79 19.79 0 01-3.13-8.63A2 2 0 013.54 3h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.91 10.5a16 16 0 006 6l.92-.92a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0121.5 18z"/></svg>
        <span style="font-size:13px;color:white;">${data.branchPhone}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
        <span style="font-size:13px;color:white;">${data.branchEmail}</span>
      </div>
    </div>
  </div>

</div>
<style>.print-btn{position:fixed;top:12px;right:12px;padding:8px 18px;background:#1A7A8E;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:Arial,sans-serif;z-index:9999;}@media print{.print-btn{display:none;}}</style>
<button class="print-btn" onclick="window.print()">Print</button>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

export function openPrintInvoice(data: InvoiceData): boolean {
  const win = window.open('', '_blank', 'width=860,height=1100');
  if (!win) return false;
  win.document.write(generateInvoiceHtml(data));
  win.document.close();
  return true;
}
